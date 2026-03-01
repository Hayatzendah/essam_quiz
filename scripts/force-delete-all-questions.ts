import { connect, disconnect, connection } from 'mongoose';

// جرب كل الاحتمالات الممكنة لقاعدة البيانات
const possibleURIs = [
  process.env.MONGO_URI,
  process.env.MONGODB_URI,
  'mongodb://localhost:27017/quiz',
  'mongodb://127.0.0.1:27017/quiz',
  'mongodb://localhost:27017/quiz-backend',
  'mongodb://127.0.0.1:27017/quiz-backend',
];

async function forceDeleteAllQuestions() {
  for (const uri of possibleURIs) {
    if (!uri) continue;

    try {
      console.log(`\n🔌 Trying to connect to: ${uri}`);
      await connect(uri);
      console.log('✅ Connected successfully');

      const db = connection.db;
      if (!db) {
        console.log('⚠️  No database connection');
        await disconnect();
        continue;
      }

      const questionsCollection = db.collection('questions');
      const countBefore = await questionsCollection.countDocuments({});

      console.log(`📊 Found ${countBefore} questions`);

      if (countBefore > 0) {
        console.log(`🗑️  Deleting all ${countBefore} questions...`);
        const deleteResult = await questionsCollection.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} questions`);
      } else {
        console.log('ℹ️  No questions to delete');
      }

      await disconnect();
      console.log('👋 Disconnected');

    } catch (error) {
      console.log(`❌ Failed to connect or delete: ${error.message}`);
      try {
        await disconnect();
      } catch (e) {
        // ignore
      }
    }
  }

  console.log('\n✅ Finished checking all possible databases');
}

if (require.main === module) {
  forceDeleteAllQuestions()
    .then(() => {
      console.log('🎉 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { forceDeleteAllQuestions };
