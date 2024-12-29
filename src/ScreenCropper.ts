
//-----
// This class handles the cropping functionality after screenshot is taken
//-----

import { BrowserWindow, ipcMain, screen } from 'electron';
import { Main } from './Main';
import { CapturedImage } from './ScreenListener';

export class ScreenCropper {
    main: Main;
    captureWindow: BrowserWindow | null = null;
    private resolveCapture: ((value: CapturedImage) => void) | null = null;

    constructor(main: Main) {
        this.main = main;
        this.setupIpcListeners();
    }

    private setupIpcListeners(): void {
        ipcMain.on('area-selected', (event, data: CapturedImage) => {
            if (this.captureWindow) {
                this.captureWindow.close();
                this.captureWindow = null;
            }
            
            if (this.resolveCapture) {
                this.resolveCapture(data);
                this.resolveCapture = null;
            }
        });
    }

    public async initializeScreenCapture(screenshotData: string): Promise<CapturedImage> {
        return new Promise((resolve) => {
            this.resolveCapture = resolve;
            this.showCropWindow(screenshotData);
        });
    }

    private async showCropWindow(screenshotData: string): Promise<void> {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        
        this.captureWindow = new BrowserWindow({
            width: width,
            height: height,
            fullscreen: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        this.captureWindow.loadFile('src/html/capture.html');

        this.captureWindow.webContents.on('did-finish-load', () => {
            if (this.captureWindow) {
                this.captureWindow.webContents.send('screenshot-taken', {
                    thumbnail: screenshotData
                });
            }
        });
    }

    public cleanup(): void {
        if (this.captureWindow) {
            this.captureWindow.close();
            this.captureWindow = null;
        }
    }
}