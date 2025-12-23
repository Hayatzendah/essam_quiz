import { connect, disconnect, connection } from 'mongoose';

const ATLAS_URI = 'mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?appName=Cluster0';

async function deleteStateQuestionsFromAtlas() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connect(ATLAS_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const questionsCollection = db.collection('questions');

    // البحث عن أسئلة الولايات (state-specific)
    const query = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    };

    console.log('🔍 Searching with query:', JSON.stringify(query, null, 2));

    const countBefore = await questionsCollection.countDocuments(query);
    console.log(`\n📊 Found ${countBefore} state questions in Atlas\n`);

    if (countBefore === 0) {
      console.log('ℹ️  No state questions found to delete.');
      return;
    }

    // عرض عينة من الأسئلة
    const sample = await questionsCollection.find(query).limit(3).toArray();
    console.log('📋 Sample of questions to be deleted (first 3):');
    sample.forEach((q, idx) => {
      console.log(`   ${idx + 1}. ID: ${q._id}`);
      console.log(`      Prompt: ${q.prompt?.substring(0, 60)}...`);
      console.log(`      State: ${q.state}`);
      console.log(`      Tags: ${JSON.stringify(q.tags)}`);
      console.log(`      usageCategory: ${q.usageCategory}`);
      console.log('');
    });

    // حذف جميع أسئلة الولايات
    console.log(`🗑️  Deleting all ${countBefore} state questions from Atlas...`);
    const deleteResult = await questionsCollection.deleteMany(query);
    console.log(`✅ Deleted ${deleteResult.deletedCount} questions\n`);

    // التحقق من العدد النهائي
    const countAfter = await questionsCollection.countDocuments(query);
    console.log(`📊 Remaining state questions: ${countAfter}`);

    // التحقق من العدد الكلي
    const totalRemaining = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    });
    console.log(`📊 Total Leben in Deutschland questions remaining: ${totalRemaining}`);

    if (countAfter === 0) {
      console.log('\n✅ All state questions have been deleted successfully from Atlas!');
      if (totalRemaining > 0) {
        console.log(`⚠️  Warning: ${totalRemaining} common questions still exist`);
      } else {
        console.log('✅ All Leben in Deutschland questions have been deleted!');
      }
    } else {
      console.log(`\n⚠️  Warning: ${countAfter} state questions still remain.`);
    }

  } catch (error) {
    console.error('❌ Error deleting questions:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB Atlas...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB Atlas');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  deleteStateQuestionsFromAtlas()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { deleteStateQuestionsFromAtlas };
