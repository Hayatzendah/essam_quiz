// Script to fix exam sections - Version 2 (force update)
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function fixExam(examId: string) {
  try {
    console.log(`\n🔍 Fixing exam: ${examId}`);

    // Use findByIdAndUpdate with direct MongoDB update
    const result = await Exam.updateOne(
      { _id: new mongoose.Types.ObjectId(examId) },
      {
        $set: {
          'sections.0.quota': 5,
          'sections.0.name': 'Section 1',
          'sections.1.quota': 5,
          'sections.1.name': 'Section 2',
        }
      }
    );

    console.log('Update result:', result);

    // Verify the update
    const exam = await Exam.findById(examId).lean();
    console.log('After update:', JSON.stringify((exam as any).sections, null, 2));

    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function main() {
  const examId = '6926380f721cf4b27545857e';
  const mongoUri = process.env.MONGO_URI || process.argv[2];

  if (!mongoUri) {
    console.error('❌ MONGO_URI required');
    process.exit(1);
  }

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected');

  await fixExam(examId);

  await mongoose.disconnect();
  console.log('\n👋 Done');
}

main();
