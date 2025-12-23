import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function findAllStateQuestions() {
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

    // البحث عن جميع الأسئلة المتعلقة بـ leben_in_deutschland
    const allLebenQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    }).toArray();

    console.log(`📊 Total questions with provider='leben_in_deutschland' and mainSkill='leben_test': ${allLebenQuestions.length}\n`);

    // البحث عن الأسئلة التي لها tags للولايات
    const stateQuestionsByTags = allLebenQuestions.filter(q => {
      if (!q.tags || !Array.isArray(q.tags)) return false;
      return q.tags.some(tag => allStates.includes(tag));
    });

    console.log(`🔍 Questions with state tags: ${stateQuestionsByTags.length}\n`);

    // تصنيف الأسئلة
    const withUsageCategory = stateQuestionsByTags.filter(q => q.usageCategory === 'state_specific');
    const withoutUsageCategory = stateQuestionsByTags.filter(q => !q.usageCategory || q.usageCategory !== 'state_specific');
    const withCommonCategory = stateQuestionsByTags.filter(q => q.usageCategory === 'common');

    console.log(`📋 Breakdown of state questions:`);
    console.log(`   - With usageCategory='state_specific': ${withUsageCategory.length}`);
    console.log(`   - Without usageCategory or different: ${withoutUsageCategory.length}`);
    console.log(`   - With usageCategory='common': ${withCommonCategory.length}\n`);

    // عرض عينة من الأسئلة بدون usageCategory
    if (withoutUsageCategory.length > 0) {
      console.log(`⚠️  Sample of questions WITHOUT usageCategory='state_specific' (first 5):`);
      withoutUsageCategory.slice(0, 5).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}`);
        console.log(`      Prompt: ${q.prompt?.substring(0, 60)}...`);
        console.log(`      State: ${q.state || 'N/A'}, usageCategory: ${q.usageCategory || 'NONE'}`);
        console.log(`      Tags: ${JSON.stringify(q.tags)}`);
        console.log(`      Created: ${q.createdAt}`);
        console.log('');
      });
    }

    // عرض عينة من الأسئلة الجديدة
    if (withUsageCategory.length > 0) {
      console.log(`✅ Sample of NEW questions (with usageCategory='state_specific', first 5):`);
      withUsageCategory.slice(0, 5).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}`);
        console.log(`      Prompt: ${q.prompt?.substring(0, 60)}...`);
        console.log(`      State: ${q.state || 'N/A'}, usageCategory: ${q.usageCategory}`);
        console.log(`      Tags: ${JSON.stringify(q.tags)}`);
        console.log(`      Created: ${q.createdAt}`);
        console.log(`      Has correctAnswer: ${!!q.correctAnswer}`);
        console.log('');
      });
    }

    // إحصائيات حسب الولاية
    const stateMap = new Map<string, { total: number; withCategory: number; withoutCategory: number }>();
    
    stateQuestionsByTags.forEach(q => {
      const stateTag = q.tags?.find(tag => allStates.includes(tag)) || 'UNKNOWN';
      const current = stateMap.get(stateTag) || { total: 0, withCategory: 0, withoutCategory: 0 };
      current.total++;
      if (q.usageCategory === 'state_specific') {
        current.withCategory++;
      } else {
        current.withoutCategory++;
      }
      stateMap.set(stateTag, current);
    });

    if (stateMap.size > 0) {
      console.log(`\n📈 Questions by state:`);
      stateMap.forEach((stats, state) => {
        console.log(`   ${state}: ${stats.total} total (${stats.withCategory} new, ${stats.withoutCategory} old)`);
      });
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
  findAllStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { findAllStateQuestions };





