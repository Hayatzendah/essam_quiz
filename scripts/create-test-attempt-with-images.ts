import { connect, disconnect, connection, Types } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function createTestAttemptWithImages() {
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
    const attemptsCollection = db.collection('attempts');
    const examsCollection = db.collection('exams');
    const usersCollection = db.collection('users');

    // أرقام الأسئلة التي لها صور (من الأسئلة العامة)
    const questionNumbersWithImages = [21, 55, 70, 130, 176, 181, 187, 209, 216, 226, 235];

    console.log('🔍 Finding questions with images...');
    
    // جلب جميع الأسئلة العامة
    const allCommonQuestions: any[] = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'common',
      status: 'published'
    }).sort({ createdAt: 1 }).toArray(); // ترتيب حسب تاريخ الإنشاء

    console.log(`📊 Found ${allCommonQuestions.length} common questions total`);

    // البحث عن الأسئلة التي لها صور (باستخدام prompt matching أو ترتيب)
    // بما أن الأسئلة مرتبة في JSON، يمكننا استخدام الترتيب
    const questionsWithImages: any[] = [];
    
    for (let i = 0; i < allCommonQuestions.length; i++) {
      const questionNumber = i + 1;
      if (questionNumbersWithImages.includes(questionNumber)) {
        const q = allCommonQuestions[i];
        if (q.media || (q.images && q.images.length > 0)) {
          questionsWithImages.push(q);
          console.log(`✅ Found question ${questionNumber} with images: ${q.prompt?.substring(0, 50)}...`);
        }
      }
    }

    if (questionsWithImages.length === 0) {
      console.log('❌ No questions with images found!');
      console.log('💡 Make sure you ran: npm run refresh-leben-questions');
      return;
    }

    console.log(`\n📸 Found ${questionsWithImages.length} questions with images\n`);

    // البحث عن exam و student (أو إنشاء test data)
    let exam = await examsCollection.findOne({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test'
    });

    // إذا لم يجد، يبحث عن أي exam بـ leben
    if (!exam) {
      exam = await examsCollection.findOne({
        $or: [
          { provider: 'leben_in_deutschland' },
          { provider: 'Deutschland-in-Leben' },
          { mainSkill: 'leben_test' },
          { examCategory: 'leben_exam' }
        ]
      });
    }

    if (!exam) {
      console.log('⚠️  No Leben exam found. Please create one first.');
      console.log('💡 You can create an exam via Postman: POST /exams');
      return;
    }

    let student = await usersCollection.findOne({ role: 'student' });
    if (!student) {
      student = await usersCollection.findOne({});
    }

    if (!student) {
      console.log('⚠️  No student user found. Please create one first.');
      return;
    }

    console.log(`📝 Using exam: ${exam._id}`);
    console.log(`👤 Using student: ${student._id}\n`);

    // إنشاء items للأسئلة
    const items = questionsWithImages.map((q: any) => {
      const item: any = {
        questionId: q._id,
        qType: q.qType,
        points: 1,
        promptSnapshot: q.prompt,
      };

      // حفظ options
      if (q.options && q.options.length > 0) {
        item.optionsText = q.options.map((opt: any) => opt.text);
        item.optionOrder = q.options.map((_: any, idx: number) => idx);
        item.optionsSnapshot = q.options.map((opt: any, idx: number) => ({
          optionId: opt._id?.toString() || new Types.ObjectId().toString(),
          text: opt.text,
          isCorrect: opt.isCorrect || false,
        }));
        item.correctOptionIndexes = q.options
          .map((opt: any, idx: number) => (opt.isCorrect ? idx : -1))
          .filter((idx: number) => idx >= 0);
      }

      // حفظ media (الصورة الأولى)
      if (q.media) {
        item.mediaType = q.media.type;
        item.mediaMime = q.media.mime;
        item.mediaUrl = q.media.url;
        item.mediaSnapshot = {
          type: q.media.type,
          key: q.media.key,
          mime: q.media.mime,
          url: q.media.url,
        };
      }

      // حفظ images (جميع الصور)
      if (q.images && q.images.length > 0) {
        item.imagesSnapshot = q.images.map((img: any) => ({
          type: 'image',
          key: img.key,
          mime: img.mime,
          url: img.url,
        }));
        console.log(`   📸 Question ${q._id}: Added ${q.images.length} images to snapshot`);
      }

      return item;
    });

    // إنشاء المحاولة
    const attempt = {
      examId: exam._id,
      studentId: student._id,
      status: 'in_progress',
      attemptCount: 1,
      randomSeed: 0,
      startedAt: new Date(),
      items: items,
      totalMaxScore: items.length,
      examVersion: exam.version || 1,
    };

    const result = await attemptsCollection.insertOne(attempt);
    console.log(`\n✅ Created test attempt: ${result.insertedId}`);
    console.log(`📊 Total questions: ${items.length}`);
    console.log(`\n🔗 You can now view this attempt in Postman:`);
    console.log(`   GET /attempts/${result.insertedId}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  createTestAttemptWithImages()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { createTestAttemptWithImages };

