//-----
// This is the Main project file that coordinates all functionality
//-----

import { app, BrowserWindow } from 'electron';
import AreaSelector from './AreaSelector';
import ProcessWindow from './ProcessWindow';
import OCRProcessor from './OCRProcessor';
import { ScreenListener } from './ScreenListener';
import { ScreenCropper } from './ScreenCropper';

export class Main {
  public mainWindow: BrowserWindow | null = null;
  public screenListener: ScreenListener;
  public screenCropper: ScreenCropper;
  public ocrProcessor: OCRProcessor;
  public processWindow: ProcessWindow;

  constructor() {
      this.screenListener = new ScreenListener(this);
      this.screenCropper = new ScreenCropper(this);
      this.ocrProcessor = new OCRProcessor(this);
      this.processWindow = new ProcessWindow(this);
      this.initializeApp();
  }

  private async awaitSequence() {
      try {
          // await CTRL+L and get full screenshot
          const screenshotData = await this.screenListener.initializeListener();

          // Get cropped image from screenshot
          const croppedImage = await this.screenCropper.initializeScreenCapture(screenshotData);
          
          // Show OCR processing status
          await this.processWindow.showProcessingWindow("Processing Image...");
          
          // Process with OCR
          const textResult = await this.ocrProcessor.initializeOCRProcessor(croppedImage);
          
          // Show OCR result status
          await this.processWindow.showProcessingWindow("Processing Text: " + textResult.substring(0, 50) + "...");
          
          // Wait briefly then remove the result
          await new Promise(resolve => setTimeout(resolve, 30000));
          
          // Cleanup
          this.processWindow.cleanup();
          this.screenCropper.cleanup();

          // restart the sequence
          this.awaitSequence();
          
      } catch (error) {
          console.error('Process Sequence Error:', error);
          this.processWindow.cleanup();
          this.screenCropper.cleanup();
          this.awaitSequence();  // Restart even on error
      }
  }

  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.awaitSequence();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Cleanup when app is quitting
    app.on('will-quit', () => {
      this.screenCropper.cleanup();
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.mainWindow.loadFile('src/html/index.html');
  }
}

// Start the application
new Main();