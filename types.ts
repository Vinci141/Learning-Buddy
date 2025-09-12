
export interface Flashcard {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface MindMapNode {
  topic: string;
  children?: MindMapNode[];
}

export interface StudyMaterials {
  summary: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  mindMap: MindMapNode;
}

export type Tab = 'summary' | 'flashcards' | 'quiz' | 'mindmap';