export type ExamDifficulty =
  | 'Standard Mock Exam'
  | 'Quick Revision (15 Sticky-Note Cards)';

export type SourceType = 'text' | 'pdf';

export interface StudySource {
  type: SourceType;
  notesText: string;
  pdfBase64?: string;
  pdfName?: string;
  pdfSizeBytes?: number;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  concept: string;
  hint?: string;
}

export interface FillInBlankQuestion {
  id: string;
  sentence: string;
  answer: string;
  concept: string;
  hint?: string;
}

export interface StructuredQuestion {
  id: string;
  question: string;
  contextTag: string;
  maxMarks: number;
  concept: string;
  hint?: string;
}

export interface MockExam {
  topicTitle: string;
  sourceSummary: string;
  difficulty: ExamDifficulty;
  mcqs: MCQQuestion[];
  fillInBlanks: FillInBlankQuestion[];
  wordBank: string[];
  structured: StructuredQuestion[];
}

export interface StructuredGradeResult {
  id: string;
  score: number;
  maxMarks: number;
  feedback: string;
  missingKeyTerms: string[];
  modelAnswer: string;
  concept: string;
}

export interface GradingResponse {
  results: StructuredGradeResult[];
  overallFeedback: string;
}

export interface Eli12Explanation {
  analogyTitle: string;
  analogy: string;
  keyTakeaway: string;
}
