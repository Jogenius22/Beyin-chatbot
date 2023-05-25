export enum OpenAIModel {
  DAVINCI_TURBO = "gpt-3.5-turbo"
}

export type Message = {
  type: 'apiMessage' | 'userMessage';
  message: string;
  isStreaming?: boolean;
  
};

export type Role = "assistant" | "user";

export type PDFChunk = {
  content: string;
  embedding: number[];
};
