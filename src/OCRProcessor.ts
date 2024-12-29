//-----
// This class handles OCR processing of images
//-----

import { Main } from './Main';
import Tesseract from 'tesseract.js';
import { CapturedImage } from './ScreenListener';

export class OCRProcessor {
    main: Main;

    constructor(main: Main) {
        this.main = main;
    }

    public async initializeOCRProcessor(image: CapturedImage): Promise<string> {
        try {
            const result = await Tesseract.recognize(
                image.imageData,
                'eng',
                { logger: m => console.log(m) }
            );
            
            return result.data.text;
        } catch (error) {
            console.error('OCR Error:', error);
            return '';
        }
    }
}

export default OCRProcessor;