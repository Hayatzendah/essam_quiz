import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function deleteAllStateQuestions() {
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

    // البحث عن جميع الأسئلة المتعلقة بـ leben_in_deutschland و mainSkill = leben_test
    const allLebenQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    }).toArray();

    console.log(`📊 Total questions with provider='leben_in_deutschland' and mainSkill='leben_test': ${allLebenQuestions.length}\n`);

    // البحث عن الأسئلة التي لها tags للولايات (بغض النظر عن usageCategory)
    const stateQuestionsQuery = {
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      tags: { $in: allStates }
    };

    const stateQuestions = await questionsCollection.find(stateQuestionsQuery).toArray();
    console.log(`🔍 Found ${stateQuestions.length} questions with state tags\n`);

    // عرض تفاصيل الأسئلة قبل الحذف
    if (stateQuestions.length > 0) {
      console.log(`📋 Sample of questions to be deleted (first 10):`);
      stateQuestions.slice(0, 10).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}`);
        console.log(`      Prompt: ${q.prompt?.substring(0, 60)}...`);
        console.log(`      State: ${q.state || 'N/A'}, usageCategory: ${q.usageCategory || 'N/A'}`);
        console.log(`      Tags: ${JSON.stringify(q.tags)}`);
        console.log(`      Created: ${q.createdAt}`);
        console.log('');
      });
    }

    // حذف جميع الأسئلة
    if (stateQuestions.length > 0) {
      console.log(`🗑️  Deleting ${stateQuestions.length} state questions...`);
      const deleteResult = await questionsCollection.deleteMany(stateQuestionsQuery);
      console.log(`✅ Deleted ${deleteResult.deletedCount} questions\n`);
    } else {
      console.log('ℹ️  No state questions found to delete\n');
    }

    // التحقق من العدد النهائي
    const remainingStateQuestions = await questionsCollection.find(stateQuestionsQuery).toArray();
    console.log(`📊 Remaining state questions: ${remainingStateQuestions.length}`);

    // التحقق من الأسئلة العامة (300-Fragen)
    const commonQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      tags: { $in: ['300-Fragen'] }
    }).toArray();
    console.log(`📊 Common questions (300-Fragen): ${commonQuestions.length}`);

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
  deleteAllStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { deleteAllStateQuestions };





