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

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';
