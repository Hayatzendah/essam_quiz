// Script to create test questions
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({}, { strict: false });
const Question = mongoose.model('Question', questionSchema);

async function createQuestions() {
  try {
    console.log('\n📝 Creating test questions...\n');

    const questions = [
      {
        text: 'Was ist richtig? Ich ___ aus Deutschland.',
        options: [
          { text: 'komme', isCorrect: true },
          { text: 'kommen', isCorrect: false },
          { text: 'kommst', isCorrect: false },
          { text: 'kommt', isCorrect: false },
        ],
        correctAnswer: 'komme',
        explanation: 'Ich komme - erste Person Singular',
        difficulty: 'easy',
        level: 'A1',
        status: 'published',
        tags: ['grammar', 'verbs'],
      },
      {
        text: 'Wie heißt du?',
        options: [
          { text: 'Ich heiße Maria', isCorrect: true },
          { text: 'Du heißt Maria', isCorrect: false },
          { text: 'Er heißt Maria', isCorrect: false },
          { text: 'Sie heißt Maria', isCorrect: false },
        ],
        correctAnswer: 'Ich heiße Maria',
        explanation: 'Antwort auf "Wie heißt du?"',
        difficulty: 'easy',
        level: 'A1',
        status: 'published',
        tags: ['grammar', 'introduction'],
      },
      {
        text: 'Der Tisch ist ___.',
        options: [
          { text: 'groß', isCorrect: true },
          { text: 'große', isCorrect: false },
          { text: 'großer', isCorrect: false },
          { text: 'großen', isCorrect: false },
        ],
        correctAnswer: 'groß',
        explanation: 'Adjektiv ohne Endung nach "sein"',
        difficulty: 'medium',
        level: 'A1',
        status: 'published',
        tags: ['grammar', 'adjectives'],
      },
    ];

    const created = await Question.insertMany(questions);

    console.log(`✅ Created ${created.length} questions:`);
    created.forEach((q: any, i: number) => {
      console.log(`   ${i + 1}. ${q.text} (ID: ${q._id})`);
    });

    return created.map((q: any) => q._id.toString());
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

async function main() {
  const mongoUri = process.env.MONGO_URI || process.argv[2];
  if (!mongoUri) {
    console.error('❌ MONGO_URI required');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const questionIds = await createQuestions();

  console.log('\n📋 Question IDs for exam creation:');
  questionIds.forEach((id, i) => {
    console.log(`   Question ${i + 1}: ${id}`);
  });

  await mongoose.disconnect();
}

main();
