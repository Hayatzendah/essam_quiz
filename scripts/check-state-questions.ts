import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function checkStateQuestions() {
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
    const allLebenQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    }).toArray();

    console.log(`📊 Total questions with provider='leben_in_deutschland' and mainSkill='leben_test': ${allLebenQuestions.length}\n`);

    // تصنيف الأسئلة
    const commonQuestions = allLebenQuestions.filter(q => q.usageCategory === 'common');
    const stateQuestions = allLebenQuestions.filter(q => q.usageCategory === 'state_specific');
    const noCategoryQuestions = allLebenQuestions.filter(q => !q.usageCategory);

    console.log(`📋 Breakdown:`);
    console.log(`   - Common questions (usageCategory='common'): ${commonQuestions.length}`);
    console.log(`   - State-specific questions (usageCategory='state_specific'): ${stateQuestions.length}`);
    console.log(`   - Questions without usageCategory: ${noCategoryQuestions.length}\n`);

    // تفاصيل أسئلة الولايات
    if (stateQuestions.length > 0) {
      console.log(`📋 State-specific questions details:`);
      
      const statesMap = new Map<string, number>();
      stateQuestions.forEach(q => {
        const state = q.state || 'NO_STATE';
        statesMap.set(state, (statesMap.get(state) || 0) + 1);
      });

      statesMap.forEach((count, state) => {
        console.log(`   - ${state}: ${count} questions`);
      });

      // عرض عينة من الأسئلة
      console.log(`\n📋 Sample state-specific questions (first 3):`);
      stateQuestions.slice(0, 3).forEach((q, idx) => {
        console.log(`   ${idx + 1}. State: ${q.state || 'N/A'}, Prompt: ${q.prompt?.substring(0, 50)}..., Tags: ${JSON.stringify(q.tags)}, Created: ${q.createdAt}`);
      });
    }

    // التحقق من الأسئلة بدون state field
    if (stateQuestions.length > 0) {
      const questionsWithoutState = stateQuestions.filter(q => !q.state);
      if (questionsWithoutState.length > 0) {
        console.log(`\n⚠️  Warning: Found ${questionsWithoutState.length} state-specific questions without 'state' field!`);
      }
    }

    console.log('\n✅ Check completed!');
  } catch (error) {
    console.error('❌ Error checking questions:', error);
    throw error;
  } finally {
    console.log('👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  checkStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkStateQuestions };












