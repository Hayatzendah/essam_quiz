import { connect, disconnect, Types, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function findDuplicateStateQuestions() {
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

    // تجميع حسب الولاية
    const questionsByState = new Map<string, any[]>();
    allStateQuestions.forEach(q => {
      const state = q.state;
      if (state) {
        if (!questionsByState.has(state)) {
          questionsByState.set(state, []);
        }
        questionsByState.get(state)!.push(q);
      }
    });

    console.log(`📋 Questions per state:`);
    questionsByState.forEach((questions, state) => {
      console.log(`   - ${state}: ${questions.length} questions`);
      
      // التحقق من duplicate prompts
      const promptsMap = new Map<string, any[]>();
      questions.forEach(q => {
        const prompt = q.prompt;
        if (prompt) {
          if (!promptsMap.has(prompt)) {
            promptsMap.set(prompt, []);
          }
          promptsMap.get(prompt)!.push(q);
        }
      });

      const duplicates = Array.from(promptsMap.entries()).filter(([_, qs]) => qs.length > 1);
      if (duplicates.length > 0) {
        console.log(`      ⚠️  Found ${duplicates.length} duplicate prompts in ${state}:`);
        duplicates.forEach(([prompt, qs]) => {
          console.log(`         - "${prompt.substring(0, 50)}...": ${qs.length} questions`);
          qs.forEach(q => {
            console.log(`           * ID: ${q._id}, Created: ${q.createdAt}`);
          });
        });
      }
    });

    // البحث عن أسئلة قديمة (قد تكون بدون state أو ب state مختلف)
    const questionsWithoutState = allStateQuestions.filter(q => !q.state);
    if (questionsWithoutState.length > 0) {
      console.log(`\n⚠️  Found ${questionsWithoutState.length} state-specific questions without 'state' field:`);
      questionsWithoutState.slice(0, 5).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}, Prompt: ${q.prompt?.substring(0, 50)}..., Tags: ${JSON.stringify(q.tags)}`);
      });
    }

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
  findDuplicateStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { findDuplicateStateQuestions };





