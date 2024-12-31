import { BrowserWindow, ipcMain, screen } from 'electron';
import { Main } from './Main';
import { CapturedImage } from './ScreenListener';
import * as path from 'path';
import * as fs from 'fs';

export class ScreenCropper {
    main: Main;
    captureWindow: BrowserWindow | null = null;
    private resolveCapture: ((value: CapturedImage|null) => void) | null = null;

    constructor(main: Main) {
        this.main = main;
        this.setupIpcListeners();
    }

    private setupIpcListeners(): void {
        ipcMain.on('area-selected', (event, data: CapturedImage) => {
            // Check if the selection is at least 20x20 pixels
            if (data.bounds.width < 20 || data.bounds.height < 20) {
                // Ignore the selection - you might want to notify the user
                if (this.captureWindow) {
                    this.captureWindow.webContents.send('selection-too-small');
                }
                return;
            }
    
            // Ensure the image data is properly formatted
            if (!data.imageData.startsWith('data:image/png;base64,')) {
                data.imageData = `data:image/png;base64,${data.imageData}`;
            }
            
            if (this.captureWindow) {
                this.captureWindow.close();
                this.captureWindow = null;
            }
            
            if (this.resolveCapture) {
                this.resolveCapture(data);
                this.resolveCapture = null;
            }
        });

        ipcMain.on('selection-cancelled', () => {
            if (this.captureWindow) {
                this.captureWindow.close();
                this.captureWindow = null;
            }
            
            if (this.resolveCapture) {
                this.resolveCapture(null);
                this.resolveCapture = null;
            }
        });

        // Add listener for text input
        ipcMain.on('text-input', (event, text: string) => {
            if (this.main) {
                this.main.temporaryCustomPrompt = text;
            }
        });
    }

    public async initializeScreenCapture(screenshotData: string): Promise<CapturedImage|null> {
        return new Promise((resolve) => {
            this.resolveCapture = resolve;
            this.showCropWindow(screenshotData);
        });
    }

    private async showCropWindow(screenshotData: string): Promise<void> {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.bounds;
        
        this.captureWindow = new BrowserWindow({
            width: width,
            height: height,
            x: 0,
            y: 0,
            autoHideMenuBar: true,
            fullscreen: true,
            frame: false,
            transparent: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        this.captureWindow.loadFile('src/html/capture.html');

        this.captureWindow.webContents.on('did-finish-load', () => {
            if (this.captureWindow) {
                // Ensure screenshot data is properly formatted
                if (!screenshotData.startsWith('data:image/png;base64,')) {
                    screenshotData = `data:image/png;base64,${screenshotData}`;
                }
                
                this.captureWindow.webContents.send('screenshot-taken', {
                    thumbnail: screenshotData
                });

                // Enable key capture for the window
                this.captureWindow.webContents.send('enable-text-input');
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