import { connect, disconnect, connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

interface QuestionFromFile {
  prompt: string;
  qType: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  provider: string;
  mainSkill?: string;
  usageCategory?: string;
  state?: string;
  level?: string;
  status: string;
  tags: string[];
}

interface QuestionsData {
  questions: QuestionFromFile[];
}

async function refreshLebenQuestions() {
  if (!MONGODB_URI) {
    console.error('❌ MONGO_URI or MONGODB_URI is not defined. Please set it in your environment variables.');
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

    // ============================================
    // المرحلة 1: حذف جميع أسئلة الولايات
    // ============================================
    console.log('🗑️  STEP 1: Deleting ALL state questions...');
    const deleteStateQuery = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    };

    const stateCountBefore = await questionsCollection.countDocuments(deleteStateQuery);
    console.log(`   Found ${stateCountBefore} state questions to delete`);

    if (stateCountBefore > 0) {
      const deleteStateResult = await questionsCollection.deleteMany(deleteStateQuery);
      console.log(`   ✅ Deleted ${deleteStateResult.deletedCount} state questions\n`);
    } else {
      console.log('   ℹ️  No state questions found to delete\n');
    }

    // ============================================
    // المرحلة 2: حذف جميع الأسئلة العامة
    // ============================================
    console.log('🗑️  STEP 2: Deleting ALL common questions...');
    const deleteCommonQuery = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'common'
    };

    const commonCountBefore = await questionsCollection.countDocuments(deleteCommonQuery);
    console.log(`   Found ${commonCountBefore} common questions to delete`);

    if (commonCountBefore > 0) {
      const deleteCommonResult = await questionsCollection.deleteMany(deleteCommonQuery);
      console.log(`   ✅ Deleted ${deleteCommonResult.deletedCount} common questions\n`);
    } else {
      console.log('   ℹ️  No common questions found to delete\n');
    }

    // ============================================
    // المرحلة 3: استيراد الأسئلة العامة (300-Fragen)
    // ============================================
    console.log('📥 STEP 3: Importing common questions (300-Fragen)...');
    const commonJsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-300-questions.json');
    
    if (fs.existsSync(commonJsonPath)) {
      const commonFileContent = fs.readFileSync(commonJsonPath, 'utf-8');
      const commonData: QuestionsData = JSON.parse(commonFileContent);
      console.log(`   Found ${commonData.questions.length} questions in file`);

      const commonQuestionsToInsert = commonData.questions.map((q) => {
        const correctOption = q.options?.find(opt => opt.isCorrect);
        const correctAnswer = correctOption?.text || '';

        const questionData: any = {
          prompt: q.prompt,
          text: q.prompt,
          qType: q.qType,
          options: q.options?.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false
          })) || [],
          correctAnswer: correctAnswer,
          provider: q.provider,
          mainSkill: q.mainSkill || 'leben_test',
          usageCategory: q.usageCategory || 'common',
          level: q.level || 'A1',
          status: q.status || 'published',
          tags: q.tags || ['300-Fragen'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // إضافة media إذا كان موجوداً
        if ((q as any).media) {
          questionData.media = (q as any).media;
        }

        // إضافة images إذا كان موجوداً
        if ((q as any).images) {
          questionData.images = (q as any).images;
        }

        return questionData;
      });

      const commonInsertResult = await questionsCollection.insertMany(commonQuestionsToInsert);
      console.log(`   ✅ Successfully inserted ${commonInsertResult.insertedCount} common questions\n`);
    } else {
      console.log(`   ⚠️  File not found: ${commonJsonPath}`);
      console.log('   Skipping common questions import\n');
    }

    // ============================================
    // المرحلة 4: استيراد أسئلة الولايات
    // ============================================
    console.log('📥 STEP 4: Importing state questions...');
    const stateJsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-state-questions.json');
    
    if (fs.existsSync(stateJsonPath)) {
      const stateFileContent = fs.readFileSync(stateJsonPath, 'utf-8');
      const stateData: QuestionsData = JSON.parse(stateFileContent);
      console.log(`   Found ${stateData.questions.length} questions in file`);

      const stateQuestionsToInsert = stateData.questions.map((q) => {
        const correctOption = q.options?.find(opt => opt.isCorrect);
        const correctAnswer = correctOption?.text || '';

        const questionData: any = {
          prompt: q.prompt,
          text: q.prompt,
          qType: q.qType,
          options: q.options?.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false
          })) || [],
          correctAnswer: correctAnswer,
          provider: q.provider,
          mainSkill: q.mainSkill || 'leben_test',
          usageCategory: q.usageCategory || 'state_specific',
          state: q.state || '',
          level: q.level || 'A1',
          status: q.status || 'published',
          tags: q.tags || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // إضافة media إذا كان موجوداً
        if ((q as any).media) {
          questionData.media = (q as any).media;
        }

        // إضافة images إذا كان موجوداً
        if ((q as any).images) {
          questionData.images = (q as any).images;
        }

        return questionData;
      });

      const stateInsertResult = await questionsCollection.insertMany(stateQuestionsToInsert);
      console.log(`   ✅ Successfully inserted ${stateInsertResult.insertedCount} state questions\n`);
    } else {
      console.log(`   ⚠️  File not found: ${stateJsonPath}`);
      console.log('   Skipping state questions import\n');
    }

    // ============================================
    // المرحلة 5: عرض الإحصائيات النهائية
    // ============================================
    console.log('📊 STEP 5: Final statistics...');
    
    const finalStateCount = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    });
    console.log(`   State questions (state_specific): ${finalStateCount}`);

    const finalCommonCount = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'common'
    });
    console.log(`   Common questions (common): ${finalCommonCount}`);

    // عرض إحصائيات حسب الولاية
    const allStates = [
      'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
      'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
      'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
      'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen', 'NRW'
    ];

    console.log(`\n   Questions by state:`);
    for (const state of allStates) {
      const stateCount = await questionsCollection.countDocuments({
        provider: 'leben_in_deutschland',
        mainSkill: 'leben_test',
        usageCategory: 'state_specific',
        state: state
      });
      if (stateCount > 0) {
        console.log(`      ${state}: ${stateCount} questions`);
      }
    }

    console.log('\n✅ Refresh completed successfully!');
    console.log(`   Total deleted: ${stateCountBefore + commonCountBefore} questions`);
    console.log(`   Total inserted: ${finalStateCount + finalCommonCount} questions`);

  } catch (error) {
    console.error('❌ Error refreshing questions:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  refreshLebenQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { refreshLebenQuestions };

