import { connect, disconnect, connection } from 'mongoose';

const ATLAS_URI = 'mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?appName=Cluster0';

async function deleteCommonQuestionsFromAtlas() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connect(ATLAS_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const questionsCollection = db.collection('questions');

    // البحث عن الأسئلة العامة (300 سؤال)
    const query = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      tags: { $in: ['300-Fragen'] }
    };

    const countBefore = await questionsCollection.countDocuments(query);
    console.log(`📊 Found ${countBefore} common questions (300-Fragen)\n`);

    if (countBefore === 0) {
      console.log('ℹ️  No common questions found to delete.');
      return;
    }

    // عرض عينة من الأسئلة
    const sample = await questionsCollection.find(query).limit(5).toArray();
    console.log('📋 Sample of questions to be deleted (first 5):');
    sample.forEach((q, idx) => {
      console.log(`   ${idx + 1}. ID: ${q._id}`);
      console.log(`      Prompt: ${q.prompt?.substring(0, 60)}...`);
      console.log(`      Tags: ${JSON.stringify(q.tags)}`);
      console.log(`      usageCategory: ${q.usageCategory}`);
      console.log('');
    });

    // حذف جميع الأسئلة العامة
    console.log(`🗑️  Deleting all ${countBefore} common questions...`);
    const deleteResult = await questionsCollection.deleteMany(query);
    console.log(`✅ Deleted ${deleteResult.deletedCount} questions\n`);

    // التحقق من العدد النهائي
    const countAfter = await questionsCollection.countDocuments(query);
    console.log(`📊 Remaining common questions: ${countAfter}`);

    // التحقق من عدد الأسئلة المتبقية في القاعدة
    const totalRemaining = await questionsCollection.countDocuments({});
    console.log(`📊 Total questions remaining in database: ${totalRemaining}`);

    if (countAfter === 0) {
      console.log('\n✅ All common questions (300-Fragen) have been deleted successfully from Atlas!');
    } else {
      console.log(`\n⚠️  Warning: ${countAfter} common questions still remain.`);
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
  deleteCommonQuestionsFromAtlas()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { deleteCommonQuestionsFromAtlas };
