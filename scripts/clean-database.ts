// Script to clean database - delete all test data
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const attemptSchema = new mongoose.Schema({}, { strict: false });
const questionSchema = new mongoose.Schema({}, { strict: false });

const Exam = mongoose.model('Exam', examSchema);
const Attempt = mongoose.model('Attempt', attemptSchema);
const Question = mongoose.model('Question', questionSchema);

async function cleanDatabase() {
  try {
    console.log('\n🧹 Cleaning database...\n');
    console.log('=' .repeat(80));

    // Count before deletion
    const examCount = await Exam.countDocuments();
    const attemptCount = await Attempt.countDocuments();
    const questionCount = await Question.countDocuments();

    console.log(`\n📊 Current data:`);
    console.log(`   Exams: ${examCount}`);
    console.log(`   Attempts: ${attemptCount}`);
    console.log(`   Questions: ${questionCount}`);

    console.log(`\n🗑️  Deleting all data...`);

    // Delete all
    const examResult = await Exam.deleteMany({});
    const attemptResult = await Attempt.deleteMany({});
    const questionResult = await Question.deleteMany({});

    console.log(`\n✅ Deletion complete:`);
    console.log(`   Exams deleted: ${examResult.deletedCount}`);
    console.log(`   Attempts deleted: ${attemptResult.deletedCount}`);
    console.log(`   Questions deleted: ${questionResult.deletedCount}`);

    console.log(`\n✨ Database is now clean and ready for fresh data!`);
    console.log('=' .repeat(80));
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  const mongoUri = process.env.MONGO_URI || process.argv[2];

  if (!mongoUri) {
    console.error('❌ MONGO_URI required');
    process.exit(1);
  }

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  await cleanDatabase();

  await mongoose.disconnect();
  console.log('\n👋 Done');
}

main();
