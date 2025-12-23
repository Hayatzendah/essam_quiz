import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function checkOldQuestions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const questionsCollection = db.collection('questions');

    // البحث عن جميع الأسئلة التي لها provider يحتوي على "leben" أو "deutschland"
    const allLebenQuestions = await questionsCollection.find({
      $or: [
        { provider: /leben/i },
        { provider: /deutschland/i },
        { provider: 'leben_in_deutschland' }
      ]
    }).sort({ createdAt: 1 }).toArray(); // ترتيب حسب تاريخ الإنشاء

    console.log(`\n📊 Total questions with 'leben' or 'deutschland' in provider: ${allLebenQuestions.length}`);

    if (allLebenQuestions.length > 0) {
      console.log('\n📋 Sample questions (first 5):');
      allLebenQuestions.slice(0, 5).forEach((q, idx) => {
        console.log(`\n   ${idx + 1}. ID: ${q._id}`);
        console.log(`      Prompt: ${q.prompt?.substring(0, 60)}...`);
        console.log(`      Provider: ${q.provider}`);
        console.log(`      MainSkill: ${q.mainSkill}`);
        console.log(`      UsageCategory: ${q.usageCategory}`);
        console.log(`      Tags: ${JSON.stringify(q.tags)}`);
        console.log(`      Level: ${q.level}`);
        console.log(`      Status: ${q.status}`);
      });

      // إحصائيات
      const withMainSkill = allLebenQuestions.filter(q => q.mainSkill === 'leben_test').length;
      const withUsageCategory = allLebenQuestions.filter(q => q.usageCategory === 'common').length;
      const withTags = allLebenQuestions.filter(q => q.tags && q.tags.includes('300-Fragen')).length;

      console.log(`\n📈 Statistics:`);
      console.log(`   - With mainSkill='leben_test': ${withMainSkill}`);
      console.log(`   - With usageCategory='common': ${withUsageCategory}`);
      console.log(`   - With tags='300-Fragen': ${withTags}`);

      // عرض تواريخ الإنشاء
      const dates = allLebenQuestions.map(q => q.createdAt).filter(Boolean);
      if (dates.length > 0) {
        const oldest = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
        const newest = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
        console.log(`\n📅 Creation dates:`);
        console.log(`   - Oldest: ${oldest.toISOString()}`);
        console.log(`   - Newest: ${newest.toISOString()}`);
      }

      // البحث عن أسئلة بدون tags '300-Fragen'
      const withoutTags = allLebenQuestions.filter(q => !q.tags || !q.tags.includes('300-Fragen'));
      if (withoutTags.length > 0) {
        console.log(`\n🔍 Found ${withoutTags.length} questions WITHOUT '300-Fragen' tag:`);
        withoutTags.slice(0, 3).forEach((q, idx) => {
          console.log(`   ${idx + 1}. Provider: ${q.provider}, Tags: ${JSON.stringify(q.tags)}, Created: ${q.createdAt}`);
        });
      }
    }

    // البحث عن الأسئلة التي تطابق المعايير الحالية
    const exactMatch = await questionsCollection.countDocuments({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'common'
    });
    console.log(`\n🔍 Exact match (provider='leben_in_deutschland', mainSkill='leben_test', usageCategory='common'): ${exactMatch}`);

    // البحث عن أسئلة تم إنشاؤها قبل اليوم (الأسئلة القديمة)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oldQuestions = await questionsCollection.find({
      $or: [
        { provider: /leben/i },
        { provider: /deutschland/i }
      ],
      createdAt: { $lt: today }
    }).toArray();

    console.log(`\n📅 Questions created BEFORE today: ${oldQuestions.length}`);
    if (oldQuestions.length > 0) {
      console.log(`\n📋 Old questions (first 3):`);
      oldQuestions.slice(0, 3).forEach((q, idx) => {
        console.log(`   ${idx + 1}. ID: ${q._id}`);
        console.log(`      Prompt: ${q.prompt?.substring(0, 50)}...`);
        console.log(`      Provider: ${q.provider}`);
        console.log(`      MainSkill: ${q.mainSkill}`);
        console.log(`      UsageCategory: ${q.usageCategory}`);
        console.log(`      Tags: ${JSON.stringify(q.tags)}`);
        console.log(`      Created: ${q.createdAt}`);
      });
    }

    // البحث عن أسئلة بدون mainSkill أو usageCategory
    const withoutFields = await questionsCollection.find({
      $and: [
        {
          $or: [
            { provider: /leben/i },
            { provider: /deutschland/i }
          ]
        },
        {
          $or: [
            { mainSkill: { $exists: false } },
            { usageCategory: { $exists: false } }
          ]
        }
      ]
    }).toArray();

    console.log(`\n🔍 Questions without mainSkill or usageCategory: ${withoutFields.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkOldQuestions();

