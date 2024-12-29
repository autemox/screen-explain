//-----
// This class handles listening for CTRL+L and capturing the initial screenshot
//-----

import { globalShortcut, desktopCapturer } from 'electron';
import { Main } from './Main';

export interface CapturedImage {
    imageData: string;  // Base64 encoded PNG image
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export class ScreenListener {
    main: Main;
    private resolveListener: ((value: string) => void) | null = null;

    constructor(main: Main) {
        this.main = main;
    }

    public async initializeListener(): Promise<string> {
        return new Promise((resolve) => {
            this.resolveListener = resolve;
            this.registerShortcut();
        });
    }

    private registerShortcut(): void {
        globalShortcut.register('CommandOrControl+L', async () => {
            // Unregister immediately after capture
            globalShortcut.unregisterAll();
            const screenshotData = await this.captureScreen();
            if (this.resolveListener && screenshotData) {
                this.resolveListener(screenshotData);
                this.resolveListener = null;
            }
        });
    }

    private async captureScreen(): Promise<string> {
        try {
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: {
                    width: 1920,
                    height: 1080
                }
            });

            if (sources.length > 0) {
                const source = sources[0];
                return source.thumbnail.toDataURL();
            }
            return '';
        } catch (error) {
            console.error('Error capturing screen:', error);
            return '';
        }
    }

    public cleanup(): void {
        globalShortcut.unregisterAll();
    }
}
