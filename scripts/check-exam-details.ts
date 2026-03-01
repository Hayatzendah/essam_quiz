// Script to check exam section details
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function checkExam() {
  try {
    const exam = await Exam.findOne({}).lean();

    if (!exam) {
      console.log('❌ No exams found');
      return;
    }

    const e = exam as any;

    console.log(`\n📋 Exam Details:`);
    console.log(`Title: ${e.title}`);
    console.log(`ID: ${e._id}`);
    console.log(`Status: ${e.status}`);
    console.log(`\nSections:`);
    console.log(JSON.stringify(e.sections, null, 2));
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
  await checkExam();
  await mongoose.disconnect();
}

main();
