import { app, BrowserWindow, ipcMain } from 'electron';
import AreaSelector from './AreaSelector';
import ProcessWindow from './ProcessWindow';
import OCRProcessor from './OCRProcessor';
import { ScreenListener } from './ScreenListener';
import { ScreenCropper } from './ScreenCropper';
import { OpenAiUtils } from './utils/openAiUtilsCustomKey';
import ExplanationWindow from './ExplanationWindow';
import { promises as fs } from 'fs';
import * as path from 'path';

export class Main {
    public mainWindow: BrowserWindow | null = null;
    public screenListener: ScreenListener;
    public screenCropper: ScreenCropper;
    public ocrProcessor: OCRProcessor;
    public processWindow: ProcessWindow;
    public explanationWindow: ExplanationWindow;
    private openAiUtils: OpenAiUtils;
    private filePath: string;
    public apiKey: string;

    constructor() {
        this.screenListener = new ScreenListener(this);
        this.screenCropper = new ScreenCropper(this);
        this.ocrProcessor = new OCRProcessor(this);
        this.processWindow = new ProcessWindow(this);
        this.explanationWindow = new ExplanationWindow(this);
        this.openAiUtils = new OpenAiUtils();
        this.apiKey='';
        
        this.filePath = path.join(app.getPath('userData'), 'data.txt');

        this.initializeApp();
    }

    async saveString(data: string): Promise<void> {
      try {
        // Remove spaces and double quotes from the input string
        const cleanedData = data.replace(/[" ]/g, '');
        await fs.writeFile(this.filePath, cleanedData, 'utf8');
        console.log('String saved successfully:', cleanedData);
      } catch (err) {
        console.error('Error saving string:', err);
      }
    }

    async loadString(): Promise<string> {
      try {
        const data = await fs.readFile(this.filePath, 'utf8');
        console.log('Loaded string:', data);
        return data;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('Data file not found. No data to load.');
        } else {
          console.error('Error loading string:', err);
        }
        return '';
      }
    }
    
    private async awaitSequence() {
      try {
          console.log("1. Starting sequence...");
          
          // await CTRL+L and get full screenshot
          const screenshotData = await this.screenListener.initializeListener();
          console.log("2. Got screenshot data");

          // try to close any existing explanation windows
          this.explanationWindow.cleanup();

          // Get cropped image from screenshot
          const croppedImage = await this.screenCropper.initializeScreenCapture(screenshotData);
          console.log("3. Got cropped image");
          
          // Show OCR processing status
          await this.processWindow.showProcessingWindow("Processing Image...");
          console.log("4. Showed processing window");
          
          // Process with OCR
          const textToExplain = await this.ocrProcessor.initializeOCRProcessor(croppedImage);
          console.log("5. Got OCR text:", textToExplain);
          
          // Show OCR result status
          await this.processWindow.showProcessingWindow("Processing Text: " + textToExplain.substring(0, 50) + "...");
          console.log("6. Updated processing window with OCR text");
          
          // Get explanation from OpenAI
          console.log("7. Starting OpenAI query...");
          const debugLog = { value: '' };
          const query = `Please explain this text concisely: ${textToExplain}`;
          
          try {
              console.log("8. Calling OpenAI...");
              const explanation = await this.openAiUtils.simpleQuery(query, 'gpt-4-0613', debugLog, this.apiKey);
              console.log("9. Got OpenAI response:", explanation);
              
              // Show explanation window
              if(explanation) {
                  console.log("10. Opening explanation window...");
                  await this.explanationWindow.showExplanation(explanation);
                  console.log("11. Explanation window opened");
              } else {
                  console.error("OpenAI returned no explanation");
                  await this.processWindow.showProcessingWindow("Error from OpenAI: Did you use a valid API key?");
                  await this.openAiUtils.sleep(10000);
              }
          } catch (openAiError) {
              console.error("OpenAI Error:", openAiError);
              await this.processWindow.showProcessingWindow("Error from OpenAI: Did you use a valid API key?");
              await this.openAiUtils.sleep(10000);
          }

          // Cleanup
          console.log("12. Starting cleanup...");
          this.processWindow.cleanup();
          this.screenCropper.cleanup();
          console.log("13. Cleanup complete");

          // restart the sequence
          console.log("14. Restarting sequence...");
          this.awaitSequence();
          
      } catch (error) {
          console.error('Process Sequence Error:', error);
          this.processWindow.cleanup();
          this.screenCropper.cleanup();
          this.awaitSequence();  // Restart even on error
      }
  }
    private async initializeApp(): Promise<void> {
        app.whenReady().then(async () => {

            this.apiKey=await this.loadString();
            console.log('Loaded API key:', this.apiKey);

            ipcMain.on('update-api-key', (event, key) => {
              console.log(`Received API key: ${key}`);
              this.saveString(key);
            });
            
            this.awaitSequence();

            console.log('Creating main window with API key:', this.apiKey);
            this.createMainWindow(this.apiKey);
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // Cleanup when app is quitting
        app.on('will-quit', () => {
            this.screenCropper.cleanup();
            this.explanationWindow.cleanup();
        });
    }

    private createMainWindow(apiKey:string): void {
        this.mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            autoHideMenuBar: true,  // Hide the menu bar
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        this.mainWindow.loadFile('src/html/index.html').then(() => {
          // Load the saved API key and send it to the renderer process
          if (apiKey) {
              this.mainWindow?.webContents.send('load-api-key', apiKey);
          }
      });
    }
}

// Start the application
new Main();