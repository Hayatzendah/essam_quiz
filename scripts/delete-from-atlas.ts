import { connect, disconnect, connection } from 'mongoose';

const ATLAS_URI = 'mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?appName=Cluster0';

async function deleteAllQuestionsFromAtlas() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connect(ATLAS_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

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

    // عرض عينة من الأسئلة
    const sample = await questionsCollection.find({}).limit(5).toArray();
    console.log('📋 Sample of questions to be deleted (first 5):');
    sample.forEach((q, idx) => {
      console.log(`   ${idx + 1}. ID: ${q._id}`);
      console.log(`      Text: ${q.text?.substring(0, 60) || q.prompt?.substring(0, 60)}...`);
      console.log(`      Tags: ${JSON.stringify(q.tags)}`);
      console.log('');
    });

    // حذف جميع الأسئلة
    console.log(`🗑️  Deleting all ${countBefore} questions...`);
    const deleteResult = await questionsCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} questions\n`);

    // التحقق من العدد النهائي
    const countAfter = await questionsCollection.countDocuments({});
    console.log(`📊 Remaining questions: ${countAfter}`);

    if (countAfter === 0) {
      console.log('\n✅ All questions have been deleted successfully from Atlas!');
    } else {
      console.log(`\n⚠️  Warning: ${countAfter} questions still remain.`);
    }

    console.log('\n✅ Delete completed!');
  } catch (error) {
    console.error('❌ Error deleting questions:', error);
    throw error;
  } finally {
    console.log('👋 Disconnecting from MongoDB Atlas...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB Atlas');
  }
}

if (require.main === module) {
  deleteAllQuestionsFromAtlas()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { deleteAllQuestionsFromAtlas };
