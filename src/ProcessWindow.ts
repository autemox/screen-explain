//-----
// This class handles the processing status windows that appear in bottom right
//-----

import { BrowserWindow, screen } from 'electron';
import { Main } from './Main';

export class ProcessWindow {
    main: Main;
    currentWindow: BrowserWindow | null = null;

    constructor(main: Main) {
        this.main = main;
    }

    public async showProcessingWindow(message: string): Promise<void> {

        console.log('showing processing window with message:', message);
        // Close any existing window first
        if (this.currentWindow) {
            this.currentWindow.close();
            this.currentWindow = null;
        }

        // Get screen dimensions for positioning
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

        // Create new window in bottom right
        this.currentWindow = new BrowserWindow({
            width: 300,
            height: 150,
            autoHideMenuBar: true,  // Hide the menu bar
            x: screenWidth - 320,  // 20px margin from right
            y: screenHeight - 170, // 20px margin from bottom
            frame: false,          // No window frame
            resizable: false,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        this.currentWindow.loadFile('src/html/process.html');

        // Send message once window is loaded
        this.currentWindow.webContents.on('did-finish-load', () => {
            if (this.currentWindow) {
                this.currentWindow.webContents.send('update-message', { message });
            }
        });
    }

    public cleanup(): void {
        if (this.currentWindow) {
            this.currentWindow.close();
            this.currentWindow = null;
        }
    }
}

export default ProcessWindow;