
import { OpenAI } from "openai";
import { ExplanationWindow } from "./ExplanationWindow";

export class OpenAiSimpleStream {
    
  private explanationWindow: ExplanationWindow;
  private isStreaming: boolean = false;

  constructor(explanationWindow: ExplanationWindow) {
    this.explanationWindow = explanationWindow;
  }

  async startStreaming(openAiKey: string, prompt: string): Promise<void> {


    const openai = new OpenAI({ apiKey: openAiKey });
    this.isStreaming = true;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-0613",
        messages: [{ role: "user", content: prompt }],
        stream: true,
      });

      let fullString = "";

      for await (const chunk of response) {
        if (chunk.choices && chunk.choices[0]?.delta?.content && this.isStreaming) {
          const text = chunk.choices[0].delta.content;
          fullString += text;
          this.explanationWindow.updateResult(fullString);
        }
      }
    } catch (error) {
      console.error("Error while streaming from OpenAI:", error);
      throw error;
    }
  }

  stopStreaming(): void {
    console.log('Stopping OpenAiSimpleStream...');
    this.isStreaming = false;
  }
}

export default OpenAiSimpleStream;