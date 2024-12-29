//-----
// This is the Main project file that coordinates all functionality
//-----

import { app, BrowserWindow } from 'electron';
import ScreenCapture from './ScreenCapture';
import AreaSelector from './AreaSelector';

export class Main {
  public mainWindow: BrowserWindow | null = null;
  public screenCapture: ScreenCapture;
  public areaSelector: AreaSelector;

  constructor() {
    this.screenCapture = new ScreenCapture(this);
    this.areaSelector = new AreaSelector(this);
    this.initializeApp();
  }

  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.screenCapture.initializeScreenCapture();

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
      this.screenCapture.cleanup();
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