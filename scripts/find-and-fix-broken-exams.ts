// Script to find and fix ALL exams with empty sections (comprehensive check)
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const Exam = mongoose.model('Exam', examSchema);

async function findAndFixBrokenExams() {
  try {
    const exams = await Exam.find({});

    console.log(`\n📋 Checking ${exams.length} exam(s) comprehensively...\n`);
    console.log('=' .repeat(80));

    let fixedCount = 0;
    const brokenExams: any[] = [];

    for (const exam of exams) {
      const e = exam as any;
      const sections = e.sections || [];

      if (sections.length === 0) {
        console.log(`\n📝 Exam: ${e.title}`);
        console.log(`   ID: ${e._id}`);
        console.log(`   ⚠️  NO SECTIONS - This exam will not work!`);
        console.log('=' .repeat(80));
        continue;
      }

      // Deep check each section
      const problematicSections: any[] = [];
      sections.forEach((section: any, index: number) => {
        // Check items
        const hasValidItems = section.items &&
          Array.isArray(section.items) &&
          section.items.length > 0 &&
          section.items.some((item: any) => item && (item.questionId || item.question));

        // Check quota
        const hasValidQuota = section.quota &&
          typeof section.quota === 'number' &&
          section.quota > 0;

        // Check tags (for quota-based sections)
        const hasTags = section.tags &&
          Array.isArray(section.tags) &&
          section.tags.length > 0;

        const sectionName = section.name || `Section ${index + 1}`;

        if (!hasValidItems && !hasValidQuota) {
          problematicSections.push({
            index,
            name: sectionName,
            reason: 'No items and no quota',
            section: section
          });
        } else if (hasValidQuota && !hasTags) {
          problematicSections.push({
            index,
            name: sectionName,
            reason: 'Has quota but no tags',
            section: section
          });
        }
      });

      if (problematicSections.length > 0) {
        console.log(`\n🔴 BROKEN EXAM: ${e.title}`);
        console.log(`   ID: ${e._id}`);
        console.log(`   Status: ${e.status || 'unknown'}`);
        console.log(`   Total sections: ${sections.length}`);
        console.log(`   Problematic sections: ${problematicSections.length}`);

        brokenExams.push({
          id: e._id,
          title: e.title,
          sections: problematicSections
        });

        problematicSections.forEach((ps) => {
          console.log(`   - "${ps.name}": ${ps.reason}`);
          console.log(`     Section data:`, JSON.stringify(ps.section, null, 2).substring(0, 200));
        });

        // Fix the exam
        console.log(`\n   🔧 FIXING...`);
        const updateObj: any = {};

        problematicSections.forEach((ps) => {
          const index = ps.index;
          // Add quota and default tags
          updateObj[`sections.${index}.quota`] = 5;
          if (!ps.section.name) {
            updateObj[`sections.${index}.name`] = `Section ${index + 1}`;
          }
          // Add default tags if missing
          if (!ps.section.tags || ps.section.tags.length === 0) {
            updateObj[`sections.${index}.tags`] = ['general'];
          }
        });

        const result = await Exam.updateOne(
          { _id: e._id },
          { $set: updateObj }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ FIXED!`);
          fixedCount++;
        } else {
          console.log(`   ⚠️  Update failed (modifiedCount: 0)`);
        }

        console.log('=' .repeat(80));
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total exams checked: ${exams.length}`);
    console.log(`   Broken exams found: ${brokenExams.length}`);
    console.log(`   Exams fixed: ${fixedCount}`);

    if (brokenExams.length > 0) {
      console.log(`\n❌ Broken exam IDs:`);
      brokenExams.forEach((exam) => {
        console.log(`   - ${exam.id} (${exam.title})`);
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

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  await findAndFixBrokenExams();

  await mongoose.disconnect();
  console.log('\n👋 Done');
}

main();
