import { connect, disconnect, connection } from 'mongoose';

const ATLAS_URI = 'mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?appName=Cluster0';

async function checkAtlasQuestions() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connect(ATLAS_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const questionsCollection = db.collection('questions');

    // عد الأسئلة العامة (300-Fragen)
    const commonQuestionsCount = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      tags: { $in: ['300-Fragen'] }
    });

    // عد أسئلة الولايات
    const stateQuestionsCount = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      tags: { $not: { $in: ['300-Fragen'] } }
    });

    // عد كل الأسئلة
    const totalQuestionsCount = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    });

    console.log('📊 Questions Count in MongoDB Atlas:\n');
    console.log(`   Common Questions (300-Fragen): ${commonQuestionsCount}`);
    console.log(`   State Questions: ${stateQuestionsCount}`);
    console.log(`   Total Leben in Deutschland Questions: ${totalQuestionsCount}`);
    console.log('');

    if (commonQuestionsCount === 0) {
      console.log('✅ Common questions (300-Fragen) have been deleted successfully!');
    } else {
      console.log(`⚠️  Warning: ${commonQuestionsCount} common questions still exist!`);
    }

  } catch (error) {
    console.error('❌ Error checking questions:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB Atlas...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB Atlas');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  checkAtlasQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkAtlasQuestions };
