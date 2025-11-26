/**
 * فحص بنية الامتحان في MongoDB - شوف كيف مخزن بالضبط
 *
 * الاستخدام:
 * node inspect-exam-structure.js <examId>
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-backend';

async function inspectExam(examIdStr) {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n🔍 فحص بنية الامتحان في MongoDB...\n');

    const examId = new ObjectId(examIdStr);
    const exam = await db.collection('exams').findOne({ _id: examId });

    if (!exam) {
      console.error('❌ الامتحان غير موجود!');
      return;
    }

    console.log('📋 معلومات الامتحان:');
    console.log(`   Title: ${exam.title}`);
    console.log(`   Provider: ${exam.provider || 'غير محدد'}`);
    console.log(`   Level: ${exam.level || 'غير محدد'}`);
    console.log(`   Status: ${exam.status}`);
    console.log(`   Sections: ${exam.sections?.length || 0}`);

    console.log('\n📦 بنية الـ sections (كما هي مخزنة بالضبط):\n');
    console.log(JSON.stringify(exam.sections, null, 2));

    // فحص كل section بالتفصيل
    if (exam.sections && exam.sections.length > 0) {
      console.log('\n\n🔍 تحليل مفصل لكل section:\n');

      for (let i = 0; i < exam.sections.length; i++) {
        const section = exam.sections[i];
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📌 Section ${i + 1}:`);
        console.log(`   name: ${section.name || 'غير محدد'}`);
        console.log(`   section: ${section.section || 'غير محدد'}`);
        console.log(`   skill: ${section.skill || 'غير محدد'}`);
        console.log(`   label: ${section.label || 'غير محدد'}`);
        console.log(`   quota: ${section.quota || 'غير محدد'}`);
        console.log(`   tags: ${JSON.stringify(section.tags || [])}`);
        console.log(`   randomize: ${section.randomize || false}`);
        console.log(`   items: ${section.items ? `${section.items.length} items` : 'غير موجود'}`);
        console.log(`   difficultyDistribution: ${section.difficultyDistribution ? JSON.stringify(section.difficultyDistribution) : 'غير موجود'}`);

        // تحليل الـ items إذا موجودة
        if (section.items && section.items.length > 0) {
          console.log(`\n   📝 الأسئلة المحددة (items):`);
          for (let j = 0; j < Math.min(section.items.length, 5); j++) {
            const item = section.items[j];
            console.log(`      ${j + 1}. questionId: ${item.questionId}`);
            console.log(`         points: ${item.points || 1}`);

            // فحص إذا السؤال موجود في قاعدة البيانات
            try {
              const questionId = new ObjectId(item.questionId);
              const question = await db.collection('questions').findOne({ _id: questionId });

              if (question) {
                console.log(`         ✅ موجود - status: ${question.status}, qType: ${question.qType}`);
                console.log(`         provider: ${question.provider || 'غير محدد'}`);
                console.log(`         level: ${question.level || 'غير محدد'}`);
                console.log(`         tags: ${JSON.stringify(question.tags || [])}`);
              } else {
                console.log(`         ❌ السؤال غير موجود في قاعدة البيانات!`);
              }
            } catch (error) {
              console.log(`         ❌ questionId غير صالح: ${error.message}`);
            }
          }

          if (section.items.length > 5) {
            console.log(`      ... و ${section.items.length - 5} أسئلة أخرى`);
          }
        }

        // إذا كان section يستخدم quota
        if (section.quota && section.quota > 0) {
          console.log(`\n   🔍 البحث عن أسئلة بناءً على quota...`);

          // بناء الفلتر كما في الكود
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

          console.log(`   📋 الفلتر المستخدم:`);
          console.log(JSON.stringify(filter, null, 6));

          const available = await db.collection('questions').countDocuments(filter);
          console.log(`   📊 عدد الأسئلة المتاحة: ${available}/${section.quota}`);

          if (available === 0) {
            console.error(`   ❌ لا توجد أسئلة تطابق الفلتر!`);

            // فحص بدون tags
            const filterNoTags = { ...filter };
            delete filterNoTags.tags;

            const noTags = await db.collection('questions').countDocuments(filterNoTags);
            console.log(`   🔍 أسئلة بدون tags: ${noTags}`);

            if (noTags > 0) {
              // عرض عينة من الأسئلة المتاحة
              const sample = await db.collection('questions').find(filterNoTags).limit(3).toArray();
              console.log(`   📝 عينة من الأسئلة المتاحة (بدون tags):`);
              sample.forEach((q, idx) => {
                console.log(`      ${idx + 1}. ID: ${q._id}`);
                console.log(`         provider: ${q.provider}`);
                console.log(`         level: ${q.level}`);
                console.log(`         tags: ${JSON.stringify(q.tags || [])}`);
                console.log(`         status: ${q.status}`);
              });
            }

            // فحص بدون provider/level
            const filterMinimal = { status: 'published' };
            if (section.tags && section.tags.length > 0) {
              filterMinimal.tags = { $in: section.tags };
            }

            const minimal = await db.collection('questions').countDocuments(filterMinimal);
            console.log(`   🔍 أسئلة بـ tags فقط (بدون provider/level): ${minimal}`);
          }
        }

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      }
    }

    // الخلاصة
    console.log('\n\n📊 الخلاصة والتوصيات:\n');

    let hasIssues = false;

    if (!exam.sections || exam.sections.length === 0) {
      console.error('❌ المشكلة: الامتحان ليس له sections!');
      hasIssues = true;
    }

    for (let i = 0; i < (exam.sections?.length || 0); i++) {
      const section = exam.sections[i];
      const hasItems = section.items && section.items.length > 0;
      const hasQuota = section.quota && section.quota > 0;

      if (!hasItems && !hasQuota) {
        console.error(`❌ المشكلة: Section ${i + 1} ليس له items ولا quota!`);
        console.log(`   💡 الحل: أضف items أو quota للقسم`);
        hasIssues = true;
      }
    }

    if (!hasIssues) {
      console.log('✅ البنية تبدو صحيحة من ناحية التصميم');
      console.log('💡 المشكلة على الأغلب في:');
      console.log('   - status الأسئلة (يجب أن تكون published)');
      console.log('   - provider/level لا يطابق');
      console.log('   - tags الأسئلة لا تطابق tags الأقسام');
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
  console.log('\nالاستخدام: node inspect-exam-structure.js <examId>');
  console.log('مثال: node inspect-exam-structure.js 6926388f721cf4b2754587e7');
  process.exit(1);
}

inspectExam(examId);
