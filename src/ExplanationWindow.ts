import { BrowserWindow, screen, ipcMain } from 'electron';
import { Main } from './Main';
import { OpenAiSimpleStream } from './OpenAiSimpleStream';

export class ExplanationWindow {
    private window: BrowserWindow | null = null;
    private main: Main;
    private openAiSimpleStream: OpenAiSimpleStream;
    private explanationString: string = '';

    constructor(main: Main) {
        this.main = main;
        this.openAiSimpleStream = new OpenAiSimpleStream(this); // this will be overriden by the initializeExplanationWindow method
    }

    public async intializeExplanationWindow(apiKey: string, prompt: string): Promise<void> {

        this.openAiSimpleStream = new OpenAiSimpleStream(this);
        this.openAiSimpleStream.startStreaming(apiKey, prompt);
    }

    public async updateResult(explanation: string): Promise<void> {

        if (this.window && this.explanationString.length>500 && this.explanationString.substr(0, 50) != explanation.substr(0, 50)) {
            console.log('closing existing explanation window because theres a totally changed explanation.')
            this.window.close();
            this.window = null;
        }
        this.explanationString = explanation;

        if(!this.window) { 
            console.log('opening new explanation window.');
            await this.initializeWindow(explanation);
        }

        // push update to html
        if (this.window) {
            this.window.webContents.send('update-explanation', explanation);
        }
    }

    async initializeWindow(explanation: string): Promise<void> {
        // Get the primary display's work area (screen size minus taskbar/dock)
        const { workArea } = screen.getPrimaryDisplay();
            
        // Set window dimensions
        const width = 600;
        const height = 500;  // Made taller
        
        // Calculate position for bottom right
        const xPosition = workArea.x + workArea.width - width;
        const yPosition = workArea.y + workArea.height - height;

        this.window = new BrowserWindow({
            width: width,
            height: height,
            x: xPosition,
            y: yPosition,
            // hide the menu bar
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            resizable: true,
            show: true,
            alwaysOnTop: true
        });

        await this.window.loadFile('src/html/explanation.html');
        this.window.webContents.send('update-explanation', explanation);
        
        this.window.on('closed', () => {
            if (this) {
                this.cleanup();
            }
        });

        ipcMain.on('close-explanation-window', () => {
            if (this && this.window) {
                this.window.close();
            }
            else this.cleanup();
        });
    }

    public cleanup(): void {
        if (this.window) {
            this.window = null;
        }
    
        // Delete the OpenAiSimpleStream instance and stop active streaming
        if (this.openAiSimpleStream) {
            this.openAiSimpleStream.stopStreaming();
            this.openAiSimpleStream = null as any; // Explicit cleanup for garbage collection
        }
    
        console.log('ExplanationWindow and streaming resources cleaned up.');
    }
}

export default ExplanationWindow;