//-----
// This class handles OCR processing of images using Tesseract
//-----

import { Main } from './Main';
import Tesseract from 'tesseract.js';
import { CapturedImage } from './ScreenListener';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class OCRProcessorLocal {
    main: Main;

    constructor(main: Main) {
        this.main = main;
    }

    private cleanBase64Image(imageData: string): string {
        // Add data URL prefix if it doesn't exist
        if (!imageData.startsWith('data:image/png;base64,')) {
            return `data:image/png;base64,${imageData}`;
        }
        return imageData;
    }

    private async saveDebugImage(imageData: string): Promise<void> {
        try {
            // Remove prefix if exists for saving
            const cleanData = imageData.replace(/^data:image\/png;base64,/, '');
            
            // Validate base64 data
            if (!/^[A-Za-z0-9+/=]+$/.test(cleanData)) {
                throw new Error('Invalid base64 data');
            }

            const filePath = path.join(app.getPath('userData'), 'tesseract-image.png');
            const buffer = Buffer.from(cleanData, 'base64');
            await fs.promises.writeFile(filePath, buffer);
            console.log('Debug image saved for Tesseract at:', filePath);
        } catch (error) {
            console.error('Error saving debug image:', error);
        }
    }

    private validateImage(imageData: string): boolean {
        if (!imageData) {
            throw new Error('No image data provided');
        }

        // Remove prefix if exists for validation
        const cleanData = imageData.replace(/^data:image\/png;base64,/, '');
        
        try {
            // Test if it's valid base64
            Buffer.from(cleanData, 'base64');
            return true;
        } catch {
            throw new Error('Invalid base64 image data');
        }
    }

    public async initializeOCRProcessor(image: CapturedImage): Promise<string> {
        try {
            console.log('Starting local OCR processing...');
            
            // Validate input image
            if (!image || !image.imageData) {
                throw new Error('Invalid image input');
            }

            // Clean and validate image data
            const cleanImageData = this.cleanBase64Image(image.imageData);
            this.validateImage(cleanImageData);

            // Save debug image
            await this.saveDebugImage(cleanImageData);
            
            // Configure Tesseract options
            const tesseractConfig = {
                lang: 'eng',
                logger: (m: any) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
                errorHandler: (e: any) => {
                    console.error('Tesseract Error:', e);
                }
            };

            // Perform OCR
            console.log('Starting Tesseract recognition...');
            const result = await Tesseract.recognize(
                cleanImageData,
                tesseractConfig.lang,
                {
                    logger: tesseractConfig.logger,
                    errorHandler: tesseractConfig.errorHandler
                }
            );

            if (!result || !result.data || !result.data.text) {
                console.warn('No text detected in the image');
                return '';
            }

            // Clean up the recognized text
            const recognizedText = result.data.text.trim();
            console.log('OCR completed successfully');
            
            return recognizedText;

        } catch (error) {
            console.error('OCR Processing Error:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Stack trace:', error.stack);
            }
            throw error; // Re-throw to allow handling by caller
        }
    }
}

export default OCRProcessorLocal;