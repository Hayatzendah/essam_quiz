import { connect, disconnect, Types, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function testStateQuestionsQuery() {
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

    // اختبار query مشابه لـ selectRandomQuestions
    const testQueries = [
      {
        name: 'Query 1: Berlin state questions (by tags only - OLD WAY)',
        query: {
          status: 'published',
          level: 'A1',
          provider: { $regex: /^leben_in_deutschland$/i },
          mainSkill: { $regex: /^leben_test$/i },
          tags: { $in: ['Berlin'] }
        }
      },
      {
        name: 'Query 2: Berlin state questions (with usageCategory and state - NEW WAY)',
        query: {
          status: 'published',
          level: 'A1',
          provider: { $regex: /^leben_in_deutschland$/i },
          mainSkill: { $regex: /^leben_test$/i },
          usageCategory: 'state_specific',
          state: 'Berlin',
          tags: { $in: ['Berlin'] }
        }
      },
      {
        name: 'Query 3: 300-Fragen questions (with usageCategory - NEW WAY)',
        query: {
          status: 'published',
          level: 'A1',
          provider: { $regex: /^leben_in_deutschland$/i },
          mainSkill: { $regex: /^leben_test$/i },
          usageCategory: 'common',
          tags: { $in: ['300-Fragen'] }
        }
      }
    ];

    for (const testQuery of testQueries) {
      console.log(`\n📋 ${testQuery.name}:`);
      const questions = await questionsCollection.find(testQuery.query).toArray();
      console.log(`   Found: ${questions.length} questions`);
      
      if (questions.length > 0) {
        console.log(`   Sample (first 3):`);
        questions.slice(0, 3).forEach((q, idx) => {
          console.log(`      ${idx + 1}. ID: ${q._id}, Prompt: ${q.prompt?.substring(0, 40)}...`);
          console.log(`         State: ${q.state || 'N/A'}, usageCategory: ${q.usageCategory || 'N/A'}`);
          console.log(`         Has correctAnswer: ${!!q.correctAnswer}, Options: ${q.options?.length || 0}`);
        });
      }
    }

    // اختبار query بدون usageCategory (الطريقة القديمة)
    console.log(`\n⚠️  Testing OLD query (without usageCategory filter):`);
    const oldQuery = {
      status: 'published',
      level: 'A1',
      provider: { $regex: /^leben_in_deutschland$/i },
      mainSkill: { $regex: /^leben_test$/i },
      tags: { $in: ['Berlin'] }
    };
    const oldResults = await questionsCollection.find(oldQuery).toArray();
    console.log(`   Found: ${oldResults.length} questions (may include old + new)`);
    
    if (oldResults.length > 10) {
      console.log(`   ⚠️  WARNING: Found more than 10 questions! This means old questions are still present.`);
      const stateSpecific = oldResults.filter(q => q.usageCategory === 'state_specific');
      const common = oldResults.filter(q => q.usageCategory === 'common');
      const noCategory = oldResults.filter(q => !q.usageCategory);
      console.log(`      - state_specific: ${stateSpecific.length}`);
      console.log(`      - common: ${common.length}`);
      console.log(`      - no usageCategory: ${noCategory.length}`);
    }

  } catch (error) {
    console.error('❌ Error testing queries:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  testStateQuestionsQuery()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { testStateQuestionsQuery };








