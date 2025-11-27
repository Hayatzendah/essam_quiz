// Script to fix ALL exams with empty sections
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function fixAllExams() {
  try {
    const exams = await Exam.find({});

    console.log(`\n📋 Checking ${exams.length} exam(s)...\n`);
    console.log('=' .repeat(80));

    let fixedCount = 0;

    for (const exam of exams) {
      const e = exam as any;
      const sections = e.sections || [];

      if (sections.length === 0) {
        console.log(`\n⏭️  Skipping "${e.title}" - no sections`);
        continue;
      }

      const problematic: number[] = [];
      sections.forEach((section: any, index: number) => {
        const hasItems = section.items && Array.isArray(section.items) && section.items.length > 0;
        const hasQuota = section.quota && typeof section.quota === 'number' && section.quota > 0;

        if (!hasItems && !hasQuota) {
          problematic.push(index);
        }
      });

      if (problematic.length > 0) {
        console.log(`\n🔧 Fixing: ${e.title}`);
        console.log(`   ID: ${e._id}`);
        console.log(`   Empty sections: ${problematic.map(i => i + 1).join(', ')}`);

        // Fix each empty section
        const updateObj: any = {};
        problematic.forEach((index) => {
          updateObj[`sections.${index}.quota`] = 5;
          if (!sections[index].name) {
            updateObj[`sections.${index}.name`] = `Section ${index + 1}`;
          }
        });

        const result = await Exam.updateOne(
          { _id: e._id },
          { $set: updateObj }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ Fixed!`);
          fixedCount++;
        } else {
          console.log(`   ⚠️  Update failed`);
        }

        console.log('=' .repeat(80));
      }
    }

    console.log(`\n✅ Summary: Fixed ${fixedCount} exam(s)`);
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

  await fixAllExams();

  await mongoose.disconnect();
  console.log('\n👋 Done');
}

main();
