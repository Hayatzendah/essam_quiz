/**
 * Migration Script: تنظيف البيانات القديمة في MongoDB
 * 
 * هذا السكريبت يقوم بـ:
 * 1. تحويل sections.skill من "HOEREN" إلى "hoeren" (lowercase)
 * 2. تحويل difficultyDistribution.med إلى difficultyDistribution.medium
 * 3. حذف difficultyDistribution.med بعد التحويل
 * 
 * الاستخدام:
 * npx ts-node scripts/migrate-exam-data.ts
 */

import { connect, connection, model, Schema } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

interface ExamSection {
  skill?: string;
  difficultyDistribution?: {
    easy?: number;
    med?: number;
    medium?: number;
    hard?: number;
  };
  [key: string]: any;
}

interface ExamDocument {
  _id: any;
  sections?: ExamSection[];
  [key: string]: any;
}

const ExamSchema = new Schema({}, { strict: false, collection: 'exams' });
const Exam = model<ExamDocument>('Exam', ExamSchema);

async function migrateExamData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const exams = await Exam.find({}).lean().exec();
    console.log(`📊 Found ${exams.length} exams to process`);

    let updatedCount = 0;
    let skillUpdatedCount = 0;
    let difficultyUpdatedCount = 0;

    for (const exam of exams) {
      let needsUpdate = false;
      const updateData: any = {};

      if (exam.sections && Array.isArray(exam.sections)) {
        const updatedSections = exam.sections.map((section: ExamSection) => {
          const updatedSection = { ...section };
          let sectionNeedsUpdate = false;

          // 1. تحويل skill إلى lowercase
          if (section.skill && typeof section.skill === 'string') {
            const lowerSkill = section.skill.toLowerCase();
            if (section.skill !== lowerSkill) {
              updatedSection.skill = lowerSkill;
              sectionNeedsUpdate = true;
              skillUpdatedCount++;
              console.log(`  📝 Exam ${exam._id}: Converting skill "${section.skill}" → "${lowerSkill}"`);
            }
          }

          // 2. تحويل med إلى medium في difficultyDistribution
          if (section.difficultyDistribution) {
            const dist = { ...section.difficultyDistribution };
            if (dist.med !== undefined) {
              dist.medium = dist.med;
              delete dist.med;
              updatedSection.difficultyDistribution = dist;
              sectionNeedsUpdate = true;
              difficultyUpdatedCount++;
              console.log(`  📝 Exam ${exam._id}: Converting difficultyDistribution.med → medium`);
            }
          }

          if (sectionNeedsUpdate) {
            needsUpdate = true;
            return updatedSection;
          }
          return section;
        });

        if (needsUpdate) {
          updateData.sections = updatedSections;
        }
      }

      if (needsUpdate) {
        await Exam.updateOne({ _id: exam._id }, { $set: updateData });
        updatedCount++;
        console.log(`✅ Updated exam ${exam._id}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  - Total exams processed: ${exams.length}`);
    console.log(`  - Exams updated: ${updatedCount}`);
    console.log(`  - Skills converted to lowercase: ${skillUpdatedCount}`);
    console.log(`  - Difficulty distributions fixed: ${difficultyUpdatedCount}`);
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// تشغيل الـ migration
if (require.main === module) {
  migrateExamData()
    .then(() => {
      console.log('✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

export { migrateExamData };

