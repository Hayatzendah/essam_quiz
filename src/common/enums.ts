export type UserRole = 'student' | 'teacher' | 'admin';

export type QuestionLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type QuestionProvider = 'General' | 'DTZ' | 'Other';

export type QuestionSection = 'LanguageBlocks' | 'Listening' | 'Reading' | 'Writing' | 'Speaking';

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill'
  | 'match'
  | 'reorder'
  | 'short_answer'
  | 'writing'
  | 'speaking';

export type QuestionDifficulty = 'easy' | 'med' | 'hard';

export type QuestionStatus = 'draft' | 'published' | 'archived';

export type ExamStatus = 'draft' | 'published';

export const ExamStatusEnum = {
  DRAFT: 'draft' as const,
  PUBLISHED: 'published' as const,
} as const;

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

export enum ExamCategoryEnum {
  GRAMMAR = 'grammar_exam',
  LID = 'lid_exam',
  PROVIDER = 'provider_exam',
  LEBEN = 'leben_exam', // Leben in Deutschland Test
  VOCAB = 'vocab_exam',
  OTHER = 'other',
}

export enum ExamSkillEnum {
  HOEREN = 'hoeren',
  LESEN = 'lesen',
  SCHREIBEN = 'schreiben',
  SPRECHEN = 'sprechen',
  MIXED = 'mixed',
}