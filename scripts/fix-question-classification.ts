/**
 * Migration Script: Fix Question Classification
 * 
 * يصلح تصنيف الأسئلة لضمان فصل واضح:
 * - أي سؤال له state → category='state', usageCategory='state_specific'
 * - أي سؤال بدون state → category='general', usageCategory='common'
 * 
 * يمنع تكرار التصنيف في القسمين
 * 
 * ⚠️ مهم: هذا script يصلح فقط قسم التعلم (Learn/Practice)
 * الامتحانات (Exams) تبقى كما هي - لا تلمسها
 */

import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

// قائمة جميع الولايات الألمانية
const ALL_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'NRW',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

async function fixQuestionClassification() {
  if (!MONGODB_URI) {
    console.error('❌ MONGO_URI or MONGODB_URI is not defined.');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const questionsCollection = db.collection('questions');

    // جلب جميع أسئلة Leben in Deutschland (للتعلم فقط)
    const allLebenQuestions = await questionsCollection
      .find({
        provider: 'leben_in_deutschland',
        mainSkill: 'leben_test',
      })
      .toArray();

    console.log(`📊 Total Leben in Deutschland questions: ${allLebenQuestions.length}\n`);

    let fixedCount = 0;
    let generalCount = 0;
    let stateCount = 0;
    const errors: string[] = [];

    for (const question of allLebenQuestions) {
      const questionId = question._id.toString();
      let needsUpdate = false;
      const updateData: any = {};

      // تحديد إذا كان السؤال له state (من state field أو tags)
      const hasStateField = question.state && question.state.trim() !== '';
      const hasStateInTags = question.tags && Array.isArray(question.tags) && 
        question.tags.some((tag: string) => ALL_STATES.includes(tag));

      const isStateQuestion = hasStateField || hasStateInTags;
      const stateValue = hasStateField ? question.state : (question.tags?.find((tag: string) => ALL_STATES.includes(tag)) || null);

      // تحديد التصنيف الصحيح
      if (isStateQuestion) {
        // سؤال ولاية
        if (question.category !== 'state' || question.usageCategory !== 'state_specific') {
          updateData.category = 'state';
          updateData.usageCategory = 'state_specific';
          if (stateValue && !question.state) {
            updateData.state = stateValue;
          }
          needsUpdate = true;
          stateCount++;
        }
      } else {
        // سؤال عام
        if (question.category !== 'general' || question.usageCategory !== 'common') {
          updateData.category = 'general';
          updateData.usageCategory = 'common';
          // إزالة state إذا كان موجوداً بالخطأ
          if (question.state) {
            updateData.$unset = { state: '' };
          }
          needsUpdate = true;
          generalCount++;
        }
      }

      // تحديث السؤال إذا كان يحتاج تصحيح
      if (needsUpdate) {
        try {
          if (updateData.$unset) {
            await questionsCollection.updateOne(
              { _id: question._id },
              {
                $set: {
                  category: updateData.category,
                  usageCategory: updateData.usageCategory,
                  ...(updateData.state && { state: updateData.state }),
                },
                $unset: updateData.$unset,
              },
            );
          } else {
            await questionsCollection.updateOne(
              { _id: question._id },
              { $set: updateData },
            );
          }
          fixedCount++;
        } catch (error: any) {
          errors.push(`Failed to update question ${questionId}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Migration completed!\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Total questions processed: ${allLebenQuestions.length}`);
    console.log(`   - Questions fixed: ${fixedCount}`);
    console.log(`   - General questions: ${generalCount}`);
    console.log(`   - State questions: ${stateCount}`);
    console.log(`   - Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors:`);
      errors.slice(0, 10).forEach((error) => console.log(`   - ${error}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    // التحقق من النتيجة
    console.log(`\n🔍 Verification:`);
    const generalQuestions = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      $or: [
        { category: 'general' },
        { 
          category: { $exists: false },
          usageCategory: 'common',
          state: { $exists: false },
        },
      ],
    });
    const stateQuestions = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      $or: [
        { category: 'state' },
        {
          category: { $exists: false },
          usageCategory: 'state_specific',
          state: { $exists: true },
        },
      ],
    });

    console.log(`   - General questions (no state): ${generalQuestions}`);
    console.log(`   - State questions (with state): ${stateQuestions}`);
    console.log(`   - Total: ${generalQuestions + stateQuestions}`);

    // التحقق من عدم وجود تكرار
    const questionsWithBoth = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      $or: [
        { category: 'general', state: { $exists: true, $ne: null } },
        { category: 'state', state: { $exists: false } },
      ],
    });

    if (questionsWithBoth > 0) {
      console.log(`\n⚠️  WARNING: Found ${questionsWithBoth} questions with inconsistent classification!`);
    } else {
      console.log(`\n✅ All questions are properly classified!`);
    }

    console.log(`\n📌 Note: Exam generation logic (30+3 random) remains unchanged.`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// تشغيل الـ migration
if (require.main === module) {
  fixQuestionClassification()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { fixQuestionClassification };
