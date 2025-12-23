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
  level?: string;
  status: string;
  tags: string[];
}

interface QuestionsData {
  questions: QuestionFromFile[];
}

async function import300Questions() {
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
    const jsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-300-questions.json');
    console.log(`📖 Reading questions from: ${jsonPath}`);
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data: QuestionsData = JSON.parse(fileContent);

    console.log(`📊 Found ${data.questions.length} questions in file`);

    // البحث عن الأسئلة القديمة - نبحث عن جميع الأسئلة التي لها نفس provider و mainSkill و usageCategory
    // لأن المستخدم أضاف الأسئلة القديمة من Postman وقد لا تحتوي على نفس tags
    const oldQuestionsQuery = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'common'
    };
    
    const oldQuestionsCount = await questionsCollection.countDocuments(oldQuestionsQuery);
    console.log(`🔍 Found ${oldQuestionsCount} old questions with provider='leben_in_deutschland', mainSkill='leben_test', usageCategory='common'`);
    
    // عرض عينة من الأسئلة القديمة للتحقق
    if (oldQuestionsCount > 0) {
      const sampleOldQuestions = await questionsCollection.find(oldQuestionsQuery).limit(3).toArray();
      console.log(`📋 Sample of old questions (first 3):`);
      sampleOldQuestions.forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}, Prompt: ${q.prompt?.substring(0, 50)}..., Tags: ${JSON.stringify(q.tags)}, Created: ${q.createdAt}`);
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
        usageCategory: q.usageCategory || 'common',
        level: q.level || 'A1',
        status: q.status || 'published',
        tags: q.tags || ['300-Fragen'],
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
      usageCategory: 'common',
      tags: { $in: ['300-Fragen'] }
    });
    console.log(`📊 Final count: ${finalCount} questions with provider='leben_in_deutschland', mainSkill='leben_test', usageCategory='common', and tags='300-Fragen'`);

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
  import300Questions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { import300Questions };

