import { app, BrowserWindow, ipcMain, shell, Tray, Menu } from 'electron';
import AreaSelector from './AreaSelector';
import ProcessWindow from './ProcessWindow';
import OCRProcessorLocal from './OCRProcessorLocal';
import OCRProcessorGoogle from './OCRProcessorGoogle';
import { ScreenListener } from './ScreenListener';
import { ScreenCropper } from './ScreenCropper';
import { OpenAiUtils } from './utils/openAiUtilsCustomKey';
import ExplanationWindow from './ExplanationWindow';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as fs2 from 'fs';

export class Main {
    public mainWindow: BrowserWindow | null = null;
    public screenListener: ScreenListener;
    public screenCropper: ScreenCropper;
    public ocrProcessorLocal: OCRProcessorLocal;
    public ocrProcessorGoogle: OCRProcessorGoogle;
    public processWindow: ProcessWindow;
    public explanationWindow: ExplanationWindow;
    private openAiUtils: OpenAiUtils;
    private filePath: string;
    public openAiApiKey: string;
    public googleEmail: string;
    private tray: Tray | null = null;
    private isQuitting: boolean = false;

    constructor() {
      this.googleEmail='autemox@gmail.com';
      this.openAiApiKey='';
        this.screenListener = new ScreenListener(this);
        this.screenCropper = new ScreenCropper(this);
        this.ocrProcessorLocal = new OCRProcessorLocal(this);
        this.ocrProcessorGoogle = new OCRProcessorGoogle(this);
        this.processWindow = new ProcessWindow(this);
        this.explanationWindow = new ExplanationWindow(this);
        this.openAiUtils = new OpenAiUtils();
        
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
          
          // Process with OCR
          let textToExplain = '';
          await this.processWindow.showProcessingWindow("Processing Image with Google...");
          textToExplain = await this.ocrProcessorGoogle.initializeOCRProcessor(croppedImage);
          
          if(textToExplain == '') {
            await this.processWindow.showProcessingWindow("Processing Image Locally... (no valid Google API key)");
            textToExplain = await this.ocrProcessorLocal.initializeOCRProcessor(croppedImage);
          }
          console.log("5. Got OCR text:", textToExplain);
          
          // Show OCR result status
          await this.processWindow.showProcessingWindow("Processing Text: " + textToExplain.substring(0, 50) + "...");
          console.log("6. Updated processing window with OCR text");
          
          // get prompt
          const configPath = path.join(app.getPath('userData'), 'config.json');
          let config = null;
          if (fs2.existsSync(configPath)) {
            const configData = fs2.readFileSync(configPath, 'utf-8');
            config = JSON.parse(configData);
          }
          const customPrompt = config && config.customPrompt && config.customPrompt != '' ? config.customPrompt : 'Tell me about: ';

          // Get explanation from OpenAI
          console.log("7. Starting OpenAI query with prompt: ", customPrompt);
          const query = `${customPrompt}\n'${textToExplain}'\n(note the above text might be broken or fragmented, ignore fragmented and broken text and do not mention it)`;
          await this.explanationWindow.intializeExplanationWindow(this.openAiApiKey, query);

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

            this.openAiApiKey=await this.loadString();
            console.log('Loaded API key:', this.openAiApiKey);

            ipcMain.on('update-api-key', (event, key) => {
              console.log(`Received API key: ${key}`);
              this.saveString(key);
            });

            ipcMain.on('open-config-file', () => {
              const configPath = path.join(app.getPath('userData'), 'config.json');
              shell.openPath(configPath) // Opens the file in the default text editor
                  .then(() => {
                      console.log('Config file opened:', configPath);
                  })
                  .catch((err) => {
                      console.error('Failed to open config file:', err);
                  });
          });
            
            this.awaitSequence();

            console.log('Creating main window with API key:', this.openAiApiKey);
            this.createMainWindow(this.openAiApiKey);
            this.createTray();
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
          if (this.tray) {
              this.tray.destroy();
          }
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

      this.mainWindow.on('close', (event) => {
        if (!this.isQuitting) {
            event.preventDefault();
            this.mainWindow?.hide();
            return false;
        }
        return true;
      });
    }

    private createTray(): void {
      this.tray = new Tray('src/assets/icon.png'); // You'll need an icon file
      const contextMenu = Menu.buildFromTemplate([
          { 
              label: 'Show App', 
              click: () => {
                  this.mainWindow?.show();
              }
          },
          { 
              label: 'Quit', 
              click: () => {
                  this.isQuitting = true;
                  app.quit();
              }
          }
      ]);
      
      this.tray.setToolTip('Screen Explain');
      this.tray.setContextMenu(contextMenu);
      
      this.tray.on('click', () => {
          this.mainWindow?.show();
      });
  }
}

// Start the application
new Main();