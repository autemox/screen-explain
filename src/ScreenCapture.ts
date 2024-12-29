//-----
// This class handles screen capture functionality through keyboard shortcuts
//-----

import { globalShortcut, desktopCapturer, BrowserWindow, ipcMain, screen } from 'electron';
import { Main } from './Main';

export class ScreenCapture {
    main: Main;
    captureWindow: BrowserWindow | null = null;

    constructor(main: Main) {
        this.main = main;
        this.setupIpcListeners();
    }

    private setupIpcListeners(): void {
        ipcMain.on('area-selected', (event, data) => {
            // Close the capture window since we're done with it
            if (this.captureWindow) {
                this.captureWindow.close();
                this.captureWindow = null;
            }

            // Pass the cropped image to the next step
            // For now, we'll just open a new window to show the cropped image
            this.showCroppedImage(data.imageData);
        });
    }

    private showCroppedImage(imageData: string): void {
        const croppedWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        croppedWindow.loadFile('src/html/cropped.html');
        
        croppedWindow.webContents.on('did-finish-load', () => {
            croppedWindow.webContents.send('cropped-image', { imageData });
        });
    }

  public initializeScreenCapture(): void {
    // Register CMD+L for Mac and CTRL+L for others
    globalShortcut.register('CommandOrControl+L', () => {
      this.captureScreen();
    });
  }

  private async captureScreen(): Promise<void> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: 1920,
          height: 1080
        }
      });

      if (sources.length > 0) {
        // Get the first screen source
        const source = sources[0];
                
        // Then in the captureScreen method, replace the BrowserWindow creation with:
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;

        // Create a new window to show the screenshot
        this.captureWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreen: true,  // This will make it truly fullscreen
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
        });

        // We'll need to create an HTML file to display the screenshot
        this.captureWindow.loadFile('src/html/capture.html');

        // Once the window is loaded, send the screenshot data
        // In ScreenCapture.ts, update the did-finish-load event handler
        this.captureWindow.webContents.on('did-finish-load', () => {
            if (this.captureWindow) {
            const dataUrl = source.thumbnail.toDataURL();
            this.captureWindow.webContents.send('screenshot-taken', {
                thumbnail: dataUrl
            });
            this.main.areaSelector.initializeSelection(dataUrl);
            }
        });
      }
    } catch (error) {
      console.error('Error capturing screen:', error);
    }
  }

  // Cleanup method to unregister shortcuts
  public cleanup(): void {
    globalShortcut.unregisterAll();
  }
}

export default ScreenCapture;