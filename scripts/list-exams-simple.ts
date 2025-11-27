// Simple script to list all exams with IDs
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function listExams() {
  try {
    const exams = await Exam.find({}).lean();

    console.log(`\n📋 All Exams (${exams.length}):\n`);

    exams.forEach((exam: any, index: number) => {
      console.log(`${index + 1}. ${exam.title}`);
      console.log(`   ID: ${exam._id}`);
      console.log(`   Status: ${exam.status || 'unknown'}`);
      console.log(`   Sections: ${(exam.sections || []).length}`);
      console.log('');
    });
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

  await mongoose.connect(mongoUri);
  await listExams();
  await mongoose.disconnect();
}

main();
