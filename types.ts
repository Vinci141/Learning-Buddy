
export interface Flashcard {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface StudyMaterials {
  summary: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

export type Tab = 'summary' | 'flashcards' | 'quiz';
