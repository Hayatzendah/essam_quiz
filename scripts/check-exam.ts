// Script to check exam structure
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function checkExam(examId: string) {
  try {
    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      console.error(`❌ Exam not found: ${examId}`);
      return;
    }

    console.log('\n📋 Exam Details:');
    console.log('Title:', (exam as any).title);
    console.log('Sections:', JSON.stringify((exam as any).sections, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  const examId = '6926380f721cf4b27545857e';
  const mongoUri = process.env.MONGO_URI || process.argv[2];

  if (!mongoUri) {
    console.error('❌ MONGO_URI required');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  await checkExam(examId);

  await mongoose.disconnect();
}

main();
