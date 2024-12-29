# Screen Explain

Quickly learn about any text on your screen!

An Electron-based desktop application that captures screen content and explains it using OCR and AI.

When triggered with CTRL+L (CMD+L on Mac), it allows users to select a portion of their screen, processes the text content using Tesseract OCR, and provides an AI-generated explanation using OpenAI's GPT-4.

## Features

Cross-platform support (Windows & Mac)

### Building the Application

From your cmd.exe prompt, in the project folder, type:
npm start             # Runs the application from cmd prompt
npm run package       # Creates executables for current platform

## Application Architecture

The application follows a modular architecture where each class handles a specific responsibility in the screen capture and processing pipeline. Here's how the process flows through Main.ts:

1. **Main Class (`Main.ts`)**
   - Central coordinator for all functionality
   - Initializes all components and manages the application lifecycle
   - Orchestrates the sequence of operations through `awaitSequence()`

2. **Process Flow**
   - **ScreenListener**: Waits for CTRL+L/CMD+L hotkey and captures initial screenshot
   - **ScreenCropper**: Displays selection interface and handles area cropping
   - **ProcessWindow**: Shows status updates during processing
   - **OCRProcessor**: Extracts text from the cropped image using Tesseract
   - **OpenAiUtils**: Processes text through GPT-4 for explanation
   - **ExplanationWindow**: Displays the AI-generated explanation

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.