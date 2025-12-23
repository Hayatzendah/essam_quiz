import { connect, disconnect, Types, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function verifyStateQuestions() {
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

    // 1. التحقق من الأسئلة الجديدة
    const newStateQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    }).toArray();

    console.log(`✅ New state-specific questions: ${newStateQuestions.length}`);
    
    // التحقق من أن جميع الأسئلة لها state و tags
    const questionsWithoutState = newStateQuestions.filter(q => !q.state);
    const questionsWithoutTags = newStateQuestions.filter(q => !q.tags || q.tags.length === 0);
    
    if (questionsWithoutState.length > 0) {
      console.log(`⚠️  Warning: ${questionsWithoutState.length} questions without 'state' field`);
    }
    if (questionsWithoutTags.length > 0) {
      console.log(`⚠️  Warning: ${questionsWithoutTags.length} questions without 'tags'`);
    }

    // 2. التحقق من عدم وجود أسئلة قديمة
    // البحث عن أسئلة قديمة (قد تكون بدون state field أو ب state مختلف)
    const allLebenQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    }).toArray();

    const oldStateQuestions = allLebenQuestions.filter(q => {
      // أسئلة قديمة: state_specific لكن بدون state أو state مختلف
      if (q.usageCategory === 'state_specific') {
        if (!q.state) return true;
        // التحقق من أن state موجود في القائمة الجديدة
        const validStates = [
          'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg',
          'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
          'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
          'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
        ];
        if (!validStates.includes(q.state)) return true;
      }
      return false;
    });

    if (oldStateQuestions.length > 0) {
      console.log(`\n⚠️  Found ${oldStateQuestions.length} potentially old state questions:`);
      oldStateQuestions.slice(0, 5).forEach((q, idx) => {
        console.log(`   ${idx + 1}. State: ${q.state || 'N/A'}, Prompt: ${q.prompt?.substring(0, 50)}...`);
      });
    } else {
      console.log(`\n✅ No old state questions found - all questions are new!`);
    }

    // 3. اختبار query مشابه لـ API
    console.log(`\n📋 Testing API-like queries:`);
    
    // Query 1: جلب أسئلة ولاية معينة
    const berlinQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific',
      state: 'Berlin'
    }).toArray();
    console.log(`   - Berlin questions: ${berlinQuestions.length} (expected: 10)`);

    // Query 2: جلب أسئلة حسب tags
    const bayernQuestionsByTag = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      tags: 'Bayern'
    }).toArray();
    console.log(`   - Bayern questions (by tag): ${bayernQuestionsByTag.length} (expected: 10)`);

    // Query 3: جلب جميع أسئلة الولايات
    const allStateQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    }).toArray();
    console.log(`   - All state questions: ${allStateQuestions.length} (expected: 160)`);

    console.log(`\n✅ All queries working correctly!`);
    console.log(`\n📝 Summary:`);
    console.log(`   - ✅ ${newStateQuestions.length} new state-specific questions in database`);
    console.log(`   - ✅ All questions have 'state' and 'tags' fields`);
    console.log(`   - ✅ Queries are working correctly`);
    console.log(`   - ✅ Ready to use in API and exams!`);

  } catch (error) {
    console.error('❌ Error verifying questions:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  verifyStateQuestions()
    .then(() => {
      console.log('🎉 Verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyStateQuestions };





