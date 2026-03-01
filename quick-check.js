/**
 * فحص سريع للامتحان والأسئلة
 *
 * الاستخدام:
 * node quick-check.js <examId>
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-backend';

async function quickCheck(examIdStr) {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n🔍 فحص سريع...\n');

    // 1. فحص الامتحان
    const examId = new ObjectId(examIdStr);
    const exam = await db.collection('exams').findOne({ _id: examId });

    if (!exam) {
      console.error('❌ الامتحان غير موجود!');
      return;
    }

    console.log(`✅ الامتحان: ${exam.title}`);
    console.log(`   Provider: ${exam.provider}`);
    console.log(`   Level: ${exam.level}`);
    console.log(`   Status: ${exam.status}`);
    console.log(`   Sections: ${exam.sections.length}`);

    // 2. فحص كل section
    let totalQuestionsNeeded = 0;
    let totalQuestionsFound = 0;

    for (let i = 0; i < exam.sections.length; i++) {
      const section = exam.sections[i];
      console.log(`\n📌 Section ${i + 1}: ${section.name || 'Unnamed'}`);

      // إذا كان section يستخدم items (أسئلة محددة)
      if (section.items && section.items.length > 0) {
        console.log(`   📝 Items (أسئلة محددة): ${section.items.length}`);
        totalQuestionsNeeded += section.items.length;

        const questionIds = section.items.map(it => new ObjectId(it.questionId));
        const questions = await db.collection('questions').find({
          _id: { $in: questionIds },
          status: 'published'
        }).toArray();

        totalQuestionsFound += questions.length;
        console.log(`   ✅ Published: ${questions.length}/${section.items.length}`);

        if (questions.length < section.items.length) {
          console.error(`   ❌ مشكلة: بعض الأسئلة غير منشورة!`);

          // اعرض الأسئلة المفقودة
          const foundIds = questions.map(q => q._id.toString());
          const missingIds = questionIds.filter(id => !foundIds.includes(id.toString()));

          if (missingIds.length > 0) {
            console.log(`   ❌ أسئلة مفقودة أو غير منشورة: ${missingIds.length}`);
            for (const missingId of missingIds) {
              const q = await db.collection('questions').findOne({ _id: missingId });
              if (!q) {
                console.log(`      - ${missingId}: غير موجود في قاعدة البيانات`);
              } else {
                console.log(`      - ${missingId}: status = ${q.status} (يجب أن يكون published)`);
              }
            }
          }
        }
      }

      // إذا كان section يستخدم quota (أسئلة عشوائية)
      if (section.quota && section.quota > 0) {
        console.log(`   📝 Quota: ${section.quota}`);
        console.log(`   Tags: ${JSON.stringify(section.tags)}`);
        totalQuestionsNeeded += section.quota;

        // بناء الفلتر
        const filter = { status: 'published' };
        if (exam.level) filter.level = exam.level;

        if (exam.provider) {
          const provider = exam.provider.trim();
          if (provider === 'LiD' || provider === 'lid' || provider === 'LID') {
            filter.provider = { $in: ['Deutschland-in-Leben', 'LiD', 'lid', 'LID'] };
          } else if (provider === 'Deutschland-in-Leben') {
            filter.provider = { $in: ['Deutschland-in-Leben', 'LiD', 'lid', 'LID'] };
          } else {
            filter.provider = provider;
          }
        }

        if (section.tags && section.tags.length > 0) {
          filter.tags = { $in: section.tags };
        }

        const candidates = await db.collection('questions').find(filter).toArray();
        totalQuestionsFound += Math.min(candidates.length, section.quota);

        console.log(`   ✅ Available: ${candidates.length}/${section.quota}`);

        if (candidates.length < section.quota) {
          console.error(`   ❌ مشكلة: عدد الأسئلة المتاحة أقل من المطلوب!`);
          console.log(`   📋 الفلتر المستخدم:`);
          console.log(JSON.stringify(filter, null, 6));

          // تجربة بدون tags
          const filterNoTags = { status: 'published' };
          if (exam.level) filterNoTags.level = exam.level;
          if (filter.provider) filterNoTags.provider = filter.provider;

          const noTags = await db.collection('questions').find(filterNoTags).toArray();
          console.log(`   🔍 أسئلة متاحة بدون tags: ${noTags.length}`);

          if (noTags.length > 0 && noTags.length >= section.quota) {
            console.log(`   💡 الحل: أضف tags للأسئلة`);
            console.log(`      Tags المطلوبة: ${JSON.stringify(section.tags)}`);
          }
        }
      }
    }

    console.log(`\n\n📊 الخلاصة:`);
    console.log(`   أسئلة مطلوبة: ${totalQuestionsNeeded}`);
    console.log(`   أسئلة متاحة: ${totalQuestionsFound}`);

    if (totalQuestionsFound === 0) {
      console.error(`\n❌ المشكلة الرئيسية: لا توجد أسئلة متاحة للامتحان!`);
      console.log(`\n💡 الأسباب المحتملة:`);
      console.log(`   1. جميع الأسئلة status = "draft" أو "archived"`);
      console.log(`   2. provider/level الأسئلة لا يطابق الامتحان`);
      console.log(`   3. tags الأسئلة لا تطابق tags الأقسام`);
      console.log(`   4. الأسئلة المحددة في items غير موجودة`);
    } else if (totalQuestionsFound < totalQuestionsNeeded) {
      console.error(`\n⚠️ تحذير: عدد الأسئلة المتاحة أقل من المطلوب`);
    } else {
      console.log(`\n✅ عدد الأسئلة كافي!`);
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
  }
}

const examId = process.argv[2];

if (!examId) {
  console.error('❌ خطأ: يجب تحديد examId');
  console.log('الاستخدام: node quick-check.js <examId>');
  console.log('مثال: node quick-check.js 6926388f721cf4b2754587e7');
  process.exit(1);
}

quickCheck(examId);
