import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function deleteAllLebenQuestions() {
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

    // البحث عن جميع الأسئلة المتعلقة بـ leben_in_deutschland
    const query = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    };

    const countBefore = await questionsCollection.countDocuments(query);
    console.log(`📊 Found ${countBefore} questions with provider='leben_in_deutschland' and mainSkill='leben_test'\n`);

    if (countBefore === 0) {
      console.log('ℹ️  No questions found to delete.');
      return;
    }

    // عرض عينة من الأسئلة قبل الحذف
    const sampleQuestions = await questionsCollection.find(query).limit(5).toArray();
    console.log(`📋 Sample of questions to be deleted (first 5):`);
    sampleQuestions.forEach((q, idx) => {
      console.log(`   ${idx + 1}. ID: ${q._id}`);
      console.log(`      Prompt: ${q.prompt?.substring(0, 60)}...`);
      console.log(`      usageCategory: ${q.usageCategory || 'N/A'}, state: ${q.state || 'N/A'}`);
      console.log(`      Tags: ${JSON.stringify(q.tags)}`);
      console.log(`      Created: ${q.createdAt}`);
      console.log('');
    });

    // حذف جميع الأسئلة
    console.log(`🗑️  Deleting ${countBefore} questions...`);
    const deleteResult = await questionsCollection.deleteMany(query);
    console.log(`✅ Deleted ${deleteResult.deletedCount} questions\n`);

    // التحقق من العدد النهائي
    const countAfter = await questionsCollection.countDocuments(query);
    console.log(`📊 Remaining questions: ${countAfter}`);

    if (countAfter === 0) {
      console.log('\n✅ All leben_in_deutschland questions have been deleted successfully!');
      console.log('💡 Now you can re-import the new questions using:');
      console.log('   - npm run import-300-questions (for common questions)');
      console.log('   - npm run import-state-questions (for state-specific questions)');
    } else {
      console.log(`\n⚠️  Warning: ${countAfter} questions still remain.`);
    }

    console.log('\n✅ Delete completed!');
  } catch (error) {
    console.error('❌ Error deleting questions:', error);
    throw error;
  } finally {
    console.log('👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  deleteAllLebenQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { deleteAllLebenQuestions };







