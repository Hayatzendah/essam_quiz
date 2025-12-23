import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function deleteAllQuestions() {
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

    // عد الأسئلة قبل الحذف
    const countBefore = await questionsCollection.countDocuments({});
    console.log(`📊 Found ${countBefore} questions in total\n`);

    if (countBefore === 0) {
      console.log('ℹ️  No questions found to delete.');
      return;
    }

    // حذف جميع الأسئلة
    console.log(`🗑️  Deleting all ${countBefore} questions...`);
    const deleteResult = await questionsCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} questions\n`);

    // التحقق من العدد النهائي
    const countAfter = await questionsCollection.countDocuments({});
    console.log(`📊 Remaining questions: ${countAfter}`);

    if (countAfter === 0) {
      console.log('\n✅ All questions have been deleted successfully!');
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
  deleteAllQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { deleteAllQuestions };
