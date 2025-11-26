/**
 * فحص حالة قاعدة البيانات - تشخيص سريع
 *
 * الاستخدام:
 * node check-db-status.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-backend';

async function checkDbStatus() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n🔍 فحص حالة قاعدة البيانات...\n');

    // 1. فحص الامتحانات
    const totalExams = await db.collection('exams').countDocuments();
    const publishedExams = await db.collection('exams').countDocuments({ status: 'published' });
    const draftExams = await db.collection('exams').countDocuments({ status: 'draft' });

    console.log('📋 الامتحانات:');
    console.log(`   - إجمالي: ${totalExams}`);
    console.log(`   - منشورة: ${publishedExams}`);
    console.log(`   - مسودة: ${draftExams}`);

    // 2. فحص الأسئلة
    const totalQuestions = await db.collection('questions').countDocuments();
    const publishedQuestions = await db.collection('questions').countDocuments({ status: 'published' });
    const draftQuestions = await db.collection('questions').countDocuments({ status: 'draft' });
    const archivedQuestions = await db.collection('questions').countDocuments({ status: 'archived' });

    console.log('\n❓ الأسئلة:');
    console.log(`   - إجمالي: ${totalQuestions}`);
    console.log(`   - منشورة: ${publishedQuestions}`);
    console.log(`   - مسودة: ${draftQuestions}`);
    console.log(`   - أرشيف: ${archivedQuestions}`);

    if (publishedQuestions === 0) {
      console.error('\n❌ مشكلة: لا توجد أسئلة منشورة!');
      console.log('💡 الحل: قم بنشر الأسئلة باستخدام:');
      console.log('   node publish-all-questions.js --confirm');
    }

    // 3. فحص الامتحانات المنشورة - هل لها أسئلة؟
    console.log('\n🔍 فحص الامتحانات المنشورة...');
    const publishedExamsList = await db.collection('exams').find({ status: 'published' }).limit(10).toArray();

    for (const exam of publishedExamsList) {
      console.log(`\n📌 ${exam.title}`);
      console.log(`   Provider: ${exam.provider}`);
      console.log(`   Level: ${exam.level}`);
      console.log(`   Sections: ${exam.sections.length}`);

      let hasIssues = false;

      for (let i = 0; i < exam.sections.length; i++) {
        const section = exam.sections[i];

        // فحص items
        if (section.items && section.items.length > 0) {
          console.log(`   📝 Section ${i + 1}: ${section.items.length} items محددة`);

          const questionIds = section.items.map(it => it.questionId);
          const questionsFound = await db.collection('questions').countDocuments({
            _id: { $in: questionIds.map(id => {
              try {
                return new (require('mongodb').ObjectId)(id);
              } catch {
                return null;
              }
            }).filter(id => id !== null) },
            status: 'published'
          });

          if (questionsFound < section.items.length) {
            console.error(`      ❌ مشكلة: ${questionsFound}/${section.items.length} أسئلة منشورة فقط`);
            hasIssues = true;
          } else {
            console.log(`      ✅ جميع الأسئلة منشورة`);
          }
        }

        // فحص quota
        if (section.quota && section.quota > 0) {
          console.log(`   📝 Section ${i + 1}: quota ${section.quota}, tags: ${JSON.stringify(section.tags)}`);

          // بحث بسيط
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

          const available = await db.collection('questions').countDocuments(filter);

          if (available < section.quota) {
            console.error(`      ❌ مشكلة: ${available}/${section.quota} أسئلة متاحة فقط`);
            console.log(`      📋 الفلتر: ${JSON.stringify(filter)}`);
            hasIssues = true;

            // تجربة بدون tags
            const filterNoTags = { status: 'published' };
            if (exam.level) filterNoTags.level = exam.level;
            if (filter.provider) filterNoTags.provider = filter.provider;

            const noTags = await db.collection('questions').countDocuments(filterNoTags);
            if (noTags > 0) {
              console.log(`      💡 ${noTags} أسئلة متاحة بدون tags - تحقق من tags الأسئلة`);
            }
          } else {
            console.log(`      ✅ ${available} أسئلة متاحة (كافي)`);
          }
        }
      }

      if (!hasIssues) {
        console.log(`   ✅ الامتحان جاهز`);
      }
    }

    // 4. فحص providers و levels
    console.log('\n📊 إحصائيات الأسئلة حسب Provider/Level:');
    const providers = await db.collection('questions').distinct('provider', { status: 'published' });
    const levels = await db.collection('questions').distinct('level', { status: 'published' });

    console.log(`   Providers: ${JSON.stringify(providers)}`);
    console.log(`   Levels: ${JSON.stringify(levels)}`);

    for (const provider of providers) {
      for (const level of levels) {
        const count = await db.collection('questions').countDocuments({
          status: 'published',
          provider,
          level
        });
        if (count > 0) {
          console.log(`   - ${provider} / ${level}: ${count} أسئلة`);
        }
      }
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
  }
}

checkDbStatus();
