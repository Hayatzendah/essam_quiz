/**
 * سكريبت لنشر جميع الأسئلة (تغيير status من draft إلى published)
 *
 * الاستخدام:
 * node publish-all-questions.js
 */

const { MongoClient } = require('mongodb');

// MongoDB connection string - عدلها حسب إعداداتك
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-backend';

async function publishAllQuestions() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ متصل بـ MongoDB\n');

    const db = client.db();

    // جلب الأسئلة غير المنشورة
    const draftQuestions = await db.collection('questions').find({
      status: { $ne: 'published' }
    }).toArray();

    console.log(`📋 عدد الأسئلة غير المنشورة: ${draftQuestions.length}\n`);

    if (draftQuestions.length === 0) {
      console.log('✅ جميع الأسئلة منشورة بالفعل!');
      return;
    }

    // عرض عينة من الأسئلة
    console.log('📝 عينة من الأسئلة التي سيتم نشرها:');
    draftQuestions.slice(0, 5).forEach((q, idx) => {
      console.log(`   ${idx + 1}. ID: ${q._id}`);
      console.log(`      - Status: ${q.status}`);
      console.log(`      - Type: ${q.qType}`);
      console.log(`      - Prompt: ${q.prompt?.substring(0, 50)}...`);
    });

    // تأكيد
    console.log(`\n⚠️ هل تريد نشر ${draftQuestions.length} سؤال؟`);
    console.log('   للمتابعة، أضف --confirm في نهاية الأمر:');
    console.log('   node publish-all-questions.js --confirm\n');

    // فحص --confirm flag
    if (!process.argv.includes('--confirm')) {
      console.log('❌ تم الإلغاء. استخدم --confirm للمتابعة.');
      return;
    }

    // نشر الأسئلة
    console.log('\n📢 جاري نشر الأسئلة...');
    const result = await db.collection('questions').updateMany(
      { status: { $ne: 'published' } },
      { $set: { status: 'published' } }
    );

    console.log(`✅ تم نشر ${result.modifiedCount} سؤال بنجاح!`);

    // إحصائيات بعد النشر
    const totalPublished = await db.collection('questions').countDocuments({ status: 'published' });
    console.log(`\n📊 إحصائيات:`);
    console.log(`   - إجمالي الأسئلة المنشورة الآن: ${totalPublished}`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
    console.log('\n✅ تم قطع الاتصال بـ MongoDB');
  }
}

publishAllQuestions();
