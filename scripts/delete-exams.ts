// Script to delete test exams
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function deleteExam(examId: string) {
  try {
    console.log(`\n🗑️  Deleting exam: ${examId}`);

    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      console.log('❌ Exam not found (already deleted?)');
      return false;
    }

    console.log(`   Title: ${(exam as any).title || 'Untitled'}`);

    const result = await Exam.deleteOne({ _id: new mongoose.Types.ObjectId(examId) });

    if (result.deletedCount > 0) {
      console.log('✅ Exam deleted successfully');
      return true;
    } else {
      console.log('❌ Failed to delete exam');
      return false;
    }
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function main() {
  const examIds = [
    '69262594a15c6ab8ea5b2751',
    '6926380f721cf4b27545857e',
  ];

  const mongoUri = process.env.MONGO_URI || process.argv[2];

  if (!mongoUri) {
    console.error('❌ MONGO_URI required');
    process.exit(1);
  }

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');
  console.log('=' .repeat(60));

  for (const examId of examIds) {
    await deleteExam(examId);
    console.log('=' .repeat(60));
  }

  await mongoose.disconnect();
  console.log('\n👋 Done - Test exams deleted');
}

main();
