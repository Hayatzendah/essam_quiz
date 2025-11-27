// Simple script to count exams
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function countExams() {
  try {
    const count = await Exam.countDocuments();
    console.log(`\n📊 Total exams in database: ${count}`);

    if (count > 0) {
      const exams = await Exam.find({}).select('title status sections').lean();
      console.log('\n📋 Exams:');
      exams.forEach((e: any, i: number) => {
        console.log(`\n${i + 1}. ${e.title}`);
        console.log(`   ID: ${e._id}`);
        console.log(`   Status: ${e.status}`);
        console.log(`   Sections:`, e.sections ? `${e.sections.length} sections` : 'null');
      });
    }
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
  await countExams();
  await mongoose.disconnect();
}

main();
