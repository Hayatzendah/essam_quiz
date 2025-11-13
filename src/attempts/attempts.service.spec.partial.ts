// اختبارات إضافية للتصحيح - Partial Credit
describe('AttemptsService - Partial Credit', () => {
  // هذه أمثلة - يمكن إضافتها لـ attempts.service.spec.ts الموجود

  it('scores mcq multiple partial credit', () => {
    // arrange attempt item: points=3, correct={0,1,2}, student={0,1}
    const item: any = {
      qType: 'mcq',
      points: 3,
      correctOptionIndexes: [0, 1, 2],
      studentAnswerIndexes: [0, 1],
    };

    // expect autoScore = 2 (2 out of 3 correct = 2/3 * 3 = 2)
    const correct = new Set<number>(item.correctOptionIndexes);
    const ans = new Set<number>(item.studentAnswerIndexes);
    const intersect = [...ans].filter((a) => correct.has(a)).length;
    const fraction = intersect / correct.size;
    const autoScore = Math.round(item.points * fraction * 1000) / 1000;

    expect(autoScore).toBe(2);
  });

  it('scores fill with normalization', () => {
    const { normalizeAnswer } = require('../common/utils/normalize.util');

    const studentAnswer = '  PARIS  ';
    const correctAnswer = 'paris';

    const normalizedStudent = normalizeAnswer(studentAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    expect(normalizedStudent).toBe(normalizedCorrect);
  });
});

