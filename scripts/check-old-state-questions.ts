import { connect, disconnect, Types, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function checkOldStateQuestions() {
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

    // البحث عن جميع أسئلة الولايات
    const allStateQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    }).toArray();

    console.log(`📊 Total state-specific questions: ${allStateQuestions.length}\n`);

    // تصنيف الأسئلة حسب تاريخ الإنشاء
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const newQuestions = allStateQuestions.filter(q => {
      const createdAt = q.createdAt ? new Date(q.createdAt) : null;
      return createdAt && createdAt >= oneDayAgo;
    });

    const oldQuestions = allStateQuestions.filter(q => {
      const createdAt = q.createdAt ? new Date(q.createdAt) : null;
      return !createdAt || createdAt < oneDayAgo;
    });

    console.log(`📋 Classification:`);
    console.log(`   - New questions (created today): ${newQuestions.length}`);
    console.log(`   - Old questions (created before today): ${oldQuestions.length}\n`);

    // التحقق من وجود correctAnswer
    const questionsWithoutCorrectAnswer = allStateQuestions.filter(q => !q.correctAnswer);
    console.log(`⚠️  Questions without correctAnswer: ${questionsWithoutCorrectAnswer.length}`);

    if (questionsWithoutCorrectAnswer.length > 0) {
      console.log(`\n📋 Sample questions without correctAnswer (first 3):`);
      questionsWithoutCorrectAnswer.slice(0, 3).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}, State: ${q.state || 'N/A'}, Prompt: ${q.prompt?.substring(0, 50)}...`);
        console.log(`      Options: ${q.options?.length || 0}, Has correctAnswer: ${!!q.correctAnswer}`);
      });
    }

    // التحقق من الأسئلة القديمة
    if (oldQuestions.length > 0) {
      console.log(`\n⚠️  Found ${oldQuestions.length} old state questions that should be deleted!`);
      console.log(`\n📋 Sample old questions (first 5):`);
      oldQuestions.slice(0, 5).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}, State: ${q.state || 'N/A'}, Prompt: ${q.prompt?.substring(0, 50)}...`);
        console.log(`      Created: ${q.createdAt}, Has correctAnswer: ${!!q.correctAnswer}`);
      });
    }

    // التحقق من الأسئلة الجديدة
    if (newQuestions.length > 0) {
      console.log(`\n✅ New questions sample (first 3):`);
      newQuestions.slice(0, 3).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}, State: ${q.state || 'N/A'}, Prompt: ${q.prompt?.substring(0, 50)}...`);
        console.log(`      Created: ${q.createdAt}, Has correctAnswer: ${!!q.correctAnswer}`);
      });
    }

    // التحقق من duplicate (نفس الـ prompt)
    const promptsMap = new Map<string, any[]>();
    allStateQuestions.forEach(q => {
      const prompt = q.prompt;
      if (prompt) {
        if (!promptsMap.has(prompt)) {
          promptsMap.set(prompt, []);
        }
        promptsMap.get(prompt)!.push(q);
      }
    });

    const duplicates = Array.from(promptsMap.entries()).filter(([_, questions]) => questions.length > 1);
    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate prompts:`);
      duplicates.slice(0, 3).forEach(([prompt, questions]) => {
        console.log(`   - "${prompt.substring(0, 50)}...": ${questions.length} questions`);
        questions.forEach(q => {
          console.log(`     * ID: ${q._id}, Created: ${q.createdAt}, State: ${q.state}`);
        });
      });
    }

    console.log(`\n📝 Summary:`);
    console.log(`   - Total state questions: ${allStateQuestions.length}`);
    console.log(`   - New questions: ${newQuestions.length}`);
    console.log(`   - Old questions: ${oldQuestions.length}`);
    console.log(`   - Questions without correctAnswer: ${questionsWithoutCorrectAnswer.length}`);
    console.log(`   - Duplicate prompts: ${duplicates.length}`);

  } catch (error) {
    console.error('❌ Error checking questions:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  checkOldStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkOldStateQuestions };







