// Script to fix exam sections with missing items/quota
import mongoose from 'mongoose';

// Exam Schema (simplified)
const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function fixExamSections(examId: string) {
  try {
    console.log(`\n🔍 Fetching exam: ${examId}`);

    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error(`❌ Exam not found: ${examId}`);
      return false;
    }

    console.log(`✅ Found exam: ${(exam as any).title || 'Untitled'}`);

    const sections = (exam as any).sections || [];
    console.log(`📋 Total sections: ${sections.length}`);

    let modified = false;
    const problematicSections: string[] = [];

    sections.forEach((section: any, index: number) => {
      const hasItems = section.items && Array.isArray(section.items) && section.items.length > 0;
      const hasQuota = section.quota && typeof section.quota === 'number' && section.quota > 0;

      if (!hasItems && !hasQuota) {
        problematicSections.push(section.name || `Section ${index + 1}`);
        console.log(`⚠️  Section "${section.name || index + 1}" is empty - adding quota: 5`);
        section.quota = 5;
        modified = true;
      }
    });

    if (modified) {
      console.log(`\n💾 Saving exam with fixed sections...`);
      (exam as any).sections = sections;
      await exam.save();
      console.log(`✅ Exam fixed successfully!`);
      console.log(`   Fixed sections: ${problematicSections.join(', ')}`);
      return true;
    } else {
      console.log(`✅ No issues found - exam is already valid`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error fixing exam ${examId}:`, error);
    return false;
  }
}

async function main() {
  const examIds = [
    '69262594a15c6ab8ea5b2751',
    '6926380f721cf4b27545857e',
  ];

  // Get MONGO_URI from environment or command line
  const mongoUri = process.env.MONGO_URI || process.argv[2];

  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI is required!');
    console.error('\nUsage:');
    console.error('  1. Set MONGO_URI environment variable, OR');
    console.error('  2. Pass it as argument: ts-node fix-exam-sections.ts "mongodb://..."');
    console.error('\nYou can get MONGO_URI from Railway environment variables.');
    process.exit(1);
  }

  console.log('🚀 Starting exam fix script...');
  console.log(`🔌 Connecting to MongoDB...`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully\n');
    console.log('=' .repeat(60));

    for (const examId of examIds) {
      const success = await fixExamSections(examId);
      if (!success) {
        console.error(`\n❌ Failed to fix exam: ${examId}`);
      }
      console.log('=' .repeat(60));
    }

    console.log('\n✅ All exams processed!');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
