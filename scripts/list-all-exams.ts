// Script to list all exams and check for issues
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function listAllExams() {
  try {
    const exams = await Exam.find({}).lean();

    console.log(`\n📋 Found ${exams.length} exam(s)\n`);
    console.log('=' .repeat(80));

    for (const exam of exams) {
      const e = exam as any;
      const sections = e.sections || [];

      console.log(`\n📝 Exam ID: ${e._id}`);
      console.log(`   Title: ${e.title || 'Untitled'}`);
      console.log(`   Status: ${e.status || 'unknown'}`);
      console.log(`   Sections: ${sections.length}`);

      // Check for problematic sections
      const problematic: string[] = [];
      sections.forEach((section: any, index: number) => {
        const hasItems = section.items && Array.isArray(section.items) && section.items.length > 0;
        const hasQuota = section.quota && typeof section.quota === 'number' && section.quota > 0;

        if (!hasItems && !hasQuota) {
          problematic.push(section.name || `Section ${index + 1}`);
        }
      });

      if (problematic.length > 0) {
        console.log(`   ⚠️  PROBLEM: ${problematic.length} empty section(s): ${problematic.join(', ')}`);
      } else if (sections.length > 0) {
        console.log(`   ✅ All sections valid`);
      } else {
        console.log(`   ⚠️  No sections defined`);
      }

      console.log('=' .repeat(80));
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

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  await listAllExams();

  await mongoose.disconnect();
  console.log('\n👋 Done');
}

main();
