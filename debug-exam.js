/**
 * سكريبت لتشخيص مشكلة "No questions available for this exam"
 *
 * الاستخدام:
 * node debug-exam.js <examId>
 *
 * مثال:
 * node debug-exam.js 6926388f721cf4b2754587e7
 */

const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string - عدلها حسب إعداداتك
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-backend';

async function debugExam(examIdStr) {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ متصل بـ MongoDB\n');

    const db = client.db();

    // 1. جلب الامتحان
    console.log('📋 جلب الامتحان...');
    const examId = new ObjectId(examIdStr);
    const exam = await db.collection('exams').findOne({ _id: examId });

    if (!exam) {
      console.error('❌ الامتحان غير موجود!');
      return;
    }

    console.log(`✅ الامتحان موجود: ${exam.title}`);
    console.log(`   - Provider: ${exam.provider || 'غير محدد'}`);
    console.log(`   - Level: ${exam.level || 'غير محدد'}`);
    console.log(`   - Status: ${exam.status}`);
    console.log(`   - Sections: ${exam.sections.length}\n`);

    // 2. تحليل كل section
    for (let i = 0; i < exam.sections.length; i++) {
      const section = exam.sections[i];
      console.log(`\n📌 Section ${i + 1}: ${section.name || section.section || 'Unnamed'}`);
      console.log(`   - Tags: ${JSON.stringify(section.tags || [])}`);
      console.log(`   - Quota: ${section.quota || 'غير محدد'}`);
      console.log(`   - Items (أسئلة محددة): ${section.items?.length || 0}`);

      // إذا كان section يستخدم items (أسئلة محددة)
      if (section.items && section.items.length > 0) {
        console.log(`\n   🔍 فحص ${section.items.length} أسئلة محددة...`);
        const questionIds = section.items.map(it => new ObjectId(it.questionId));

        const questions = await db.collection('questions').find({
          _id: { $in: questionIds }
        }).toArray();

        console.log(`   ✅ تم العثور على ${questions.length} أسئلة في قاعدة البيانات`);

        // فحص status كل سؤال
        const publishedCount = questions.filter(q => q.status === 'published').length;
        const draftCount = questions.filter(q => q.status === 'draft').length;
        const archivedCount = questions.filter(q => q.status === 'archived').length;

        console.log(`   📊 حالة الأسئلة:`);
        console.log(`      - Published (منشورة): ${publishedCount}`);
        console.log(`      - Draft (مسودة): ${draftCount}`);
        console.log(`      - Archived (أرشيف): ${archivedCount}`);

        if (publishedCount === 0) {
          console.error(`   ❌ مشكلة: لا توجد أسئلة منشورة! جميع الأسئلة draft أو archived`);
          console.log(`   💡 الحل: قم بنشر الأسئلة باستخدام PATCH /questions/:id`);
          console.log(`      Body: { "status": "published" }`);
        }

        // عرض تفاصيل بعض الأسئلة
        if (questions.length > 0) {
          console.log(`\n   📝 عينة من الأسئلة:`);
          questions.slice(0, 3).forEach((q, idx) => {
            console.log(`      ${idx + 1}. ID: ${q._id}`);
            console.log(`         - Status: ${q.status}`);
            console.log(`         - Type: ${q.qType}`);
            console.log(`         - Provider: ${q.provider || 'غير محدد'}`);
            console.log(`         - Level: ${q.level || 'غير محدد'}`);
            console.log(`         - Tags: ${JSON.stringify(q.tags || [])}`);
          });
        }
      }

      // إذا كان section يستخدم quota (أسئلة عشوائية)
      if (section.quota && section.quota > 0) {
        console.log(`\n   🔍 فحص الأسئلة المتاحة لـ quota...`);

        // بناء الفلتر كما في الكود
        const filter = { status: 'published' };

        if (exam.level) filter.level = exam.level;

        // تطبيع provider لدعم "LiD" و "Deutschland-in-Leben"
        if (exam.provider) {
          const provider = exam.provider.trim();
          if (provider === 'LiD' || provider === 'lid' || provider === 'LID') {
            filter.provider = { $in: ['Deutschland-in-Leben', 'LiD', 'lid', 'LID'] };
          } else if (provider === 'Deutschland-in-Leben' || provider === 'Deutschland in Leben') {
            filter.provider = { $in: ['Deutschland-in-Leben', 'LiD', 'lid', 'LID', 'Deutschland in Leben'] };
          } else {
            filter.provider = provider;
          }
        }

        // إضافة tags
        if (section.tags && section.tags.length > 0) {
          const normalizedTags = [];
          for (const tag of section.tags) {
            normalizedTags.push(tag);
            const tagLower = tag.toLowerCase();
            if (tagLower.includes('fragen') && tagLower.includes('300')) {
              normalizedTags.push(
                '300-Fragen',
                'fragen-300',
                'Fragen-300',
                '300-fragen',
                '300 Fragen',
                'Fragen 300',
                '300_Fragen',
                'Fragen_300'
              );
            }
          }
          const uniqueTags = [...new Set(normalizedTags)];
          filter.tags = { $in: uniqueTags };
        }

        console.log(`   📋 الفلتر المستخدم:`);
        console.log(JSON.stringify(filter, null, 6));

        const candidates = await db.collection('questions').find(filter).toArray();
        console.log(`   ✅ عدد الأسئلة المتاحة: ${candidates.length}`);
        console.log(`   📊 Quota المطلوب: ${section.quota}`);

        if (candidates.length === 0) {
          console.error(`   ❌ مشكلة: لا توجد أسئلة تطابق الفلتر!`);

          // محاولات إضافية للتشخيص
          console.log(`\n   🔬 تشخيص متقدم:`);

          // 1. بحث بدون tags
          const filterWithoutTags = { status: 'published' };
          if (exam.level) filterWithoutTags.level = exam.level;
          if (filter.provider) filterWithoutTags.provider = filter.provider;

          const withoutTags = await db.collection('questions').find(filterWithoutTags).toArray();
          console.log(`      - أسئلة بدون فلترة tags (provider + level فقط): ${withoutTags.length}`);

          if (withoutTags.length > 0) {
            console.log(`      📝 عينة من الأسئلة المتاحة (بدون tags):`);
            withoutTags.slice(0, 3).forEach((q, idx) => {
              console.log(`         ${idx + 1}. ID: ${q._id}`);
              console.log(`            - Provider: ${q.provider}`);
              console.log(`            - Level: ${q.level}`);
              console.log(`            - Tags: ${JSON.stringify(q.tags || [])}`);
            });

            console.log(`\n      💡 الحل: تأكد من أن tags الأسئلة تطابق tags القسم:`);
            console.log(`         - Section tags: ${JSON.stringify(section.tags)}`);
            console.log(`         - أضف هذه الـ tags للأسئلة باستخدام PATCH /questions/:id`);
            console.log(`         - Body: { "tags": ${JSON.stringify(section.tags)} }`);
          } else {
            console.log(`\n      💡 الحل: لا توجد أسئلة منشورة لهذا Provider/Level`);
            console.log(`         - Provider المطلوب: ${exam.provider}`);
            console.log(`         - Level المطلوب: ${exam.level}`);
            console.log(`         - قم بإنشاء أسئلة جديدة أو تعديل provider/level للأسئلة الموجودة`);
          }

          // 2. بحث بـ tags فقط (بدون provider/level)
          if (section.tags && section.tags.length > 0) {
            const onlyTags = await db.collection('questions').find({
              status: 'published',
              tags: { $in: section.tags }
            }).toArray();
            console.log(`      - أسئلة بـ tags فقط (بدون provider/level): ${onlyTags.length}`);

            if (onlyTags.length > 0) {
              console.log(`\n      💡 الحل: الأسئلة موجودة لكن provider/level لا يطابق`);
              console.log(`         - قم بتعديل provider/level في الأسئلة لتطابق الامتحان`);
            }
          }

        } else if (candidates.length < section.quota) {
          console.error(`   ⚠️ تحذير: عدد الأسئلة المتاحة (${candidates.length}) أقل من المطلوب (${section.quota})`);
          console.log(`   💡 الحل: أضف المزيد من الأسئلة أو قلل quota في القسم`);
        } else {
          console.log(`   ✅ عدد الأسئلة كافي!`);
        }
      }
    }

    // 3. إحصائيات عامة
    console.log(`\n\n📊 إحصائيات عامة:`);
    const totalQuestions = await db.collection('questions').countDocuments();
    const publishedQuestions = await db.collection('questions').countDocuments({ status: 'published' });
    const questionsForExam = await db.collection('questions').countDocuments({
      status: 'published',
      provider: exam.provider,
      level: exam.level
    });

    console.log(`   - إجمالي الأسئلة: ${totalQuestions}`);
    console.log(`   - الأسئلة المنشورة: ${publishedQuestions}`);
    console.log(`   - أسئلة منشورة لهذا الامتحان (provider + level): ${questionsForExam}`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
    console.log('\n✅ تم قطع الاتصال بـ MongoDB');
  }
}

// الحصول على examId من command line
const examId = process.argv[2];

if (!examId) {
  console.error('❌ خطأ: يجب تحديد examId');
  console.log('الاستخدام: node debug-exam.js <examId>');
  console.log('مثال: node debug-exam.js 6926388f721cf4b2754587e7');
  process.exit(1);
}

debugExam(examId);
