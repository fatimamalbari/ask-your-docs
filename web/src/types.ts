export interface DocInfo {
  name: string;
  chunks: number;
  pages: number | null;
}

export interface Source {
  n: number;
  source: string;
  page: number | null;
  score: number;
  text: string;
}

export interface AskResult {
  known: boolean;
  answer: string;
  sources: Source[];
}

export interface AskInput {
  question: string;
  doc: string | null;
}

export type ChatMessage =
  | { id: number; question: string; status: 'pending' }
  | { id: number; question: string; status: 'error' }
  | { id: number; question: string; status: 'done'; result: AskResult };
