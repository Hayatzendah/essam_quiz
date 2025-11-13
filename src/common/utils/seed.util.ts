import * as crypto from 'crypto';

export function seedFrom(examId: string, studentId: string, attemptCount: number): number {
  const secret = process.env.RANDOM_SECRET ?? process.env.SECRET_RANDOM_SERVER ?? 'DEV_SECRET';
  const raw = `${examId}:${studentId}:${attemptCount}:${secret}`;
  const hex = crypto.createHash('sha256').update(raw).digest('hex'); // 64 hex chars
  // خُد أول 8 حروف وحوّلها لرقم 32-بت
  const n = parseInt(hex.slice(0, 8), 16) >>> 0;
  return n;
}
