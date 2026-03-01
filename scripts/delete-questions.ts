import { connect, connection } from 'mongoose';

// رابط قاعدة البيانات
const MONGO_URI = 'mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?appName=Cluster0';

// قائمة جميع الولايات الألمانية
const ALL_STATES = [
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

async function deleteQuestions() {
  try {
    console.log('🔌 الاتصال بقاعدة البيانات...');
    await connect(MONGO_URI);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح\n');

    const db = connection.db!;
    const questionsCollection = db.collection('questions');

    // 1. عد جميع الأسئلة قبل الحذف
    const totalBefore = await questionsCollection.countDocuments({});
    console.log(`📊 إجمالي الأسئلة قبل الحذف: ${totalBefore}\n`);

    // 2. بناء query لحذف الأسئلة العامة وأسئلة الولايات
    // الأسئلة العامة: usageCategory = 'common'
    // أسئلة الولايات: usageCategory = 'state_specific' أو tags تحتوي على اسم ولاية
    const deleteQuery = {
      $or: [
        // الأسئلة العامة (300-Fragen)
        { usageCategory: 'common' },
        // أسئلة الولايات
        { usageCategory: 'state_specific' },
        // للتوافق مع الأسئلة القديمة: أسئلة بها tags للولايات
        { tags: { $in: ALL_STATES } },
      ],
    };

    // 3. عد الأسئلة التي سيتم حذفها
    const toDeleteCount = await questionsCollection.countDocuments(deleteQuery);
    console.log(`🗑️  عدد الأسئلة التي سيتم حذفها: ${toDeleteCount}`);
    console.log('   - أسئلة عامة (usageCategory=common)');
    console.log('   - أسئلة الولايات (usageCategory=state_specific)');
    console.log('   - أسئلة قديمة بها tags للولايات\n');

    // عرض تفاصيل الأسئلة التي سيتم حذفها
    const commonCount = await questionsCollection.countDocuments({ usageCategory: 'common' });
    const stateSpecificCount = await questionsCollection.countDocuments({ usageCategory: 'state_specific' });
    const oldStateCount = await questionsCollection.countDocuments({
      usageCategory: { $exists: false },
      tags: { $in: ALL_STATES }
    });

    console.log(`📋 تفاصيل الحذف:`);
    console.log(`   • أسئلة عامة (common): ${commonCount}`);
    console.log(`   • أسئلة الولايات (state_specific): ${stateSpecificCount}`);
    console.log(`   • أسئلة ولايات قديمة: ${oldStateCount}\n`);

    // 4. حذف الأسئلة
    console.log('🚀 بدء عملية الحذف...');
    const result = await questionsCollection.deleteMany(deleteQuery);
    console.log(`✅ تم حذف ${result.deletedCount} سؤال بنجاح!\n`);

    // 5. عد الأسئلة المتبقية
    const totalAfter = await questionsCollection.countDocuments({});
    console.log(`📊 إجمالي الأسئلة بعد الحذف: ${totalAfter}`);
    console.log(`📉 الفرق: ${totalBefore - totalAfter} سؤال محذوف\n`);

    // 6. عرض أمثلة من الأسئلة المتبقية
    const remainingQuestions = await questionsCollection
      .find({})
      .limit(5)
      .project({ prompt: 1, usageCategory: 1, tags: 1, qType: 1, provider: 1 })
      .toArray();

    if (remainingQuestions.length > 0) {
      console.log('📝 أمثلة من الأسئلة المتبقية:');
      remainingQuestions.forEach((q, idx) => {
        console.log(`   ${idx + 1}. ${q.prompt?.substring(0, 50)}...`);
        console.log(`      - usageCategory: ${q.usageCategory || 'غير محدد'}`);
        console.log(`      - qType: ${q.qType}`);
        console.log(`      - provider: ${q.provider || 'غير محدد'}`);
        console.log(`      - tags: ${q.tags?.join(', ') || 'لا يوجد'}\n`);
      });
    } else {
      console.log('⚠️  لا توجد أسئلة متبقية في قاعدة البيانات');
    }

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await connection.close();
    console.log('\n🔌 تم قطع الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريبت
deleteQuestions();
