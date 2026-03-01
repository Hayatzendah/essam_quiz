import { connect, disconnect, Types, connection } from 'mongoose';
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

async function importStateQuestions() {
  if (!MONGODB_URI) {
    console.error('❌ MONGO_URI or MONGODB_URI is not defined. Please set it in your environment variables.');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const questionsCollection = db.collection('questions');

    // قراءة ملف JSON
    const jsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-state-questions.json');
    console.log(`📖 Reading questions from: ${jsonPath}`);
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data: QuestionsData = JSON.parse(fileContent);

    console.log(`📊 Found ${data.questions.length} questions in file`);

    // قائمة جميع الولايات الألمانية
    const allStates = [
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
      'Rheinland-Pfalz',
      'Saarland',
      'Sachsen',
      'Sachsen-Anhalt',
      'Schleswig-Holstein',
      'Thüringen',
      'NRW',
    ];

    // البحث عن الأسئلة القديمة - نبحث عن جميع الأسئلة التي لها نفس provider و mainSkill
    // والتي لها tags للولايات (وليس '300-Fragen') - بغض النظر عن usageCategory
    const oldQuestionsQuery = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      tags: { $in: allStates } // أي سؤال له tag لأي ولاية
    };
    
    const oldQuestionsCount = await questionsCollection.countDocuments(oldQuestionsQuery);
    console.log(`🔍 Found ${oldQuestionsCount} old questions with provider='leben_in_deutschland', mainSkill='leben_test', and state tags`);
    
    // عرض عينة من الأسئلة القديمة للتحقق
    if (oldQuestionsCount > 0) {
      const sampleOldQuestions = await questionsCollection.find(oldQuestionsQuery).limit(5).toArray();
      console.log(`📋 Sample of old questions (first 5):`);
      sampleOldQuestions.forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}, Prompt: ${q.prompt?.substring(0, 50)}..., State: ${q.state || 'N/A'}, usageCategory: ${q.usageCategory || 'N/A'}, Tags: ${JSON.stringify(q.tags)}, Created: ${q.createdAt}`);
      });
    }

    // حذف الأسئلة القديمة (حتى لو كانت موجودة)
    if (oldQuestionsCount > 0) {
      console.log('🗑️  Deleting old questions...');
      const deleteResult = await questionsCollection.deleteMany(oldQuestionsQuery);
      console.log(`✅ Deleted ${deleteResult.deletedCount} old questions`);
    } else {
      console.log('ℹ️  No old questions found to delete (this is normal if they were already deleted)');
    }

    // تحويل الأسئلة إلى الصيغة المطلوبة
    const questionsToInsert = data.questions.map((q) => {
      // استخراج الإجابة الصحيحة من الخيارات
      const correctOption = q.options?.find(opt => opt.isCorrect);
      const correctAnswer = correctOption?.text || '';

      return {
        prompt: q.prompt,
        text: q.prompt, // للحفاظ على التوافق
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
    });

    // إدراج الأسئلة الجديدة
    console.log('💾 Inserting new questions...');
    const insertResult = await questionsCollection.insertMany(questionsToInsert);
    console.log(`✅ Successfully inserted ${insertResult.insertedCount} questions`);

    // التحقق من العدد النهائي
    const finalCount = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    });
    console.log(`📊 Final count: ${finalCount} questions with provider='leben_in_deutschland', mainSkill='leben_test', usageCategory='state_specific'`);

    // عرض إحصائيات حسب الولاية
    const states = [...new Set(data.questions.map(q => q.state).filter(Boolean))];
    console.log(`\n📈 Questions by state:`);
    for (const state of states) {
      const stateCount = await questionsCollection.countDocuments({
        provider: 'leben_in_deutschland',
        mainSkill: 'leben_test',
        usageCategory: 'state_specific',
        state: state
      });
      console.log(`   ${state}: ${stateCount} questions`);
    }

    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('❌ Error importing questions:', error);
    throw error;
  } finally {
    console.log('👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  importStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { importStateQuestions };
