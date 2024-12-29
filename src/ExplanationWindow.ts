import { BrowserWindow, screen } from 'electron';
import { Main } from './Main';

export class ExplanationWindow {
    private window: BrowserWindow | null = null;
    private main: Main;

    constructor(main: Main) {
        this.main = main;
    }

    public async showExplanation(explanation: string): Promise<void> {
        if (this.window) {
            this.window.close();
            this.window = null;
        }

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
            this.window = null;
        });
    }

    public cleanup(): void {
        if (this.window) {
            this.window.close();
            this.window = null;
        }
    }
}

export default ExplanationWindow;