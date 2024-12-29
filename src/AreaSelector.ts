//-----
// This class handles area selection for cropping screenshots
//-----

import { BrowserWindow } from 'electron';
import { Main } from './Main';

export class AreaSelector {
  main: Main;
  
  constructor(main: Main) {
    this.main = main;
  }

  // Called by ScreenCapture when screenshot is ready
  public initializeSelection(screenshotDataUrl: string): void {
    // We'll use the existing captureWindow from ScreenCapture
    if (this.main.screenCropper.captureWindow) {
      this.main.screenCropper.captureWindow.webContents.send('init-area-select', {
        screenshot: screenshotDataUrl
      });
    }
  }
}

export default AreaSelector;