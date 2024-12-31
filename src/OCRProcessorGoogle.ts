//-----
// This class handles OCR processing of images using Google Cloud Vision API
//-----

import { app } from 'electron';
import { Main } from './Main';
import { CapturedImage } from './ScreenListener';
import { v1 as vision } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';

export class OCRProcessorGoogle {
    main: Main;
    client: vision.ImageAnnotatorClient;
    config: any;

    constructor(main: Main) {
        this.main = main;
        this.config = this.loadConfig();
        this.client = new vision.ImageAnnotatorClient();
    }

    private loadConfig(): any {
        try {
            const configPath = path.join(app.getPath('userData'), 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf-8');
                return JSON.parse(configData);
            } else {
                console.warn('Config file not found, creating a default config.json');
                const defaultConfig = {
                    private_key: '',
                    client_email: '',
                    customPrompt: this.main.DEFAULT_PROMPT,
                };
                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4));
                return defaultConfig;
            }
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    public async getCredentials() {
        const { private_key, client_email } = this.config;
        const privateKeyRemoveHeaders = private_key
            .replace("-----BEGIN PRIVATE KEY-----\n","")
            .replace("\n-----END PRIVATE KEY-----\n","");
        const credentials = {
            client_email: `${client_email}`,
            private_key: `-----BEGIN PRIVATE KEY-----\n${privateKeyRemoveHeaders}\n-----END PRIVATE KEY-----\n`,
        };
        return credentials;
    }

    private cleanBase64Image(imageData: string): string {
        // Remove data URL prefix if it exists
        if (imageData.includes('base64,')) {
            return imageData.split('base64,')[1];
        }
        return imageData;
    }

    private async saveDebugImage(imageData: string): Promise<void> {
        try {
            const cleanImageData = this.cleanBase64Image(imageData);
            const filePath = path.join(app.getPath('userData'), 'google-image.png');
            
            // Validate base64 data before saving
            if (!/^[A-Za-z0-9+/=]+$/.test(cleanImageData)) {
                throw new Error('Invalid base64 data');
            }

            const buffer = Buffer.from(cleanImageData, 'base64');
            await fs.promises.writeFile(filePath, buffer);
            console.log('Debug image saved successfully at:', filePath);
        } catch (error) {
            console.error('Error saving debug image:', error);
            throw error;
        }
    }

    public async initializeOCRProcessor(image: CapturedImage): Promise<string> {
        try {
            console.log('Initializing OCR Processor...');
            
            // Initialize client with credentials
            const credentials = await this.getCredentials();
            if(credentials.client_email === '' || credentials.private_key === '') return '';
            this.client = new vision.ImageAnnotatorClient({
                credentials,
            });
            console.log('OCR Processor initialized successfully.');

            // Clean and validate image data
            const cleanImageData = this.cleanBase64Image(image.imageData);
            if (!cleanImageData) {
                throw new Error('Invalid or empty image data');
            }

            // Save debug image
            await this.saveDebugImage(cleanImageData);
            console.log('Captured Image Bounds:', image.bounds);

            // Convert base64 to buffer for API
            const imageBuffer = Buffer.from(cleanImageData, 'base64');

            // Call the Google Vision API with buffer
            const [result] = await this.client.textDetection({
                image: { content: imageBuffer }
            });

            // Validate and extract text from response
            if (!result || !result.textAnnotations) {
                console.warn('Invalid or empty response from Vision API');
                return '';
            }

            const textAnnotations = result.textAnnotations;
            if (textAnnotations.length > 0 && textAnnotations[0].description) {
                return textAnnotations[0].description;
            }

            console.warn('No text detected in the image.');
            return '';

        } catch (error) {
            console.error('OCR Processing Error:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Stack trace:', error.stack);
            }
            return '';
        }
    }
}

export default OCRProcessorGoogle;