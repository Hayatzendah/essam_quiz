// Script to fix a single exam with null sections
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function fixExam(examId: string) {
  try {
    console.log(`\n🔍 Checking exam: ${examId}`);

    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error(`❌ Exam not found: ${examId}`);
      return false;
    }

    const e = exam as any;
    console.log(`✅ Found exam: ${e.title || 'Untitled'}`);
    console.log(`   Sections:`, e.sections);

    if (!e.sections || e.sections === null) {
      console.log(`\n🔧 Fixing null sections...`);

      // Set sections to empty array
      e.sections = [];

      await exam.save();
      console.log(`✅ Fixed! Sections is now an empty array`);
      return true;
    } else if (Array.isArray(e.sections) && e.sections.length === 0) {
      console.log(`⚠️  Sections is already an empty array`);
      return true;
    } else {
      console.log(`✅ Sections is valid (has ${e.sections.length} sections)`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
    return false;
  }
}

async function main() {
  const examId = process.argv[2] || '69287ffbf2b21a83e2655e86';
  const mongoUri = process.env.MONGO_URI || process.argv[3];

  if (!mongoUri) {
    console.error('❌ MONGO_URI required');
    console.error('Usage: ts-node fix-single-exam.ts <examId> <mongoUri>');
    process.exit(1);
  }

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  await fixExam(examId);

  await mongoose.disconnect();
  console.log('\n👋 Done');
}

main();
