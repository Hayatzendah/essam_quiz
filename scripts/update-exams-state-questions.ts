import { connect, disconnect, Types, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function updateExamsStateQuestions() {
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
    const examsCollection = db.collection('exams');

    // 1. جلب جميع الأسئلة الجديدة للولايات
    const newStateQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific'
    }).toArray();

    console.log(`📊 Found ${newStateQuestions.length} new state-specific questions\n`);

    // 2. تجميع الأسئلة الجديدة حسب الولاية
    const questionsByState = new Map<string, any[]>();
    newStateQuestions.forEach(q => {
      const state = q.state;
      if (state) {
        if (!questionsByState.has(state)) {
          questionsByState.set(state, []);
        }
        questionsByState.get(state)!.push(q);
      }
    });

    console.log(`📋 Questions grouped by state:`);
    questionsByState.forEach((questions, state) => {
      console.log(`   - ${state}: ${questions.length} questions`);
    });
    console.log('');

    // 3. البحث عن جميع الامتحانات
    const allExams = await examsCollection.find({}).toArray();
    console.log(`📚 Found ${allExams.length} exams total\n`);

    let updatedExamsCount = 0;
    let totalQuestionsReplaced = 0;

    // 4. تحديث كل امتحان
    for (const exam of allExams) {
      if (!exam.sections || !Array.isArray(exam.sections)) {
        continue;
      }

      let examUpdated = false;
      const updatedSections: any[] = [];

      for (const section of exam.sections) {
        if (!section.items || !Array.isArray(section.items)) {
          updatedSections.push(section);
          continue;
        }

        const updatedItems: any[] = [];

        for (const item of section.items) {
          if (!item.questionId) {
            updatedItems.push(item);
            continue;
          }

          try {
            // البحث عن السؤال القديم
            const oldQuestion = await questionsCollection.findOne({ 
              _id: new Types.ObjectId(item.questionId) 
            });

            if (!oldQuestion) {
              updatedItems.push(item); // السؤال غير موجود، نتركه كما هو
              continue;
            }

            // التحقق إذا كان السؤال القديم من أسئلة الولايات
            if (
              oldQuestion.provider === 'leben_in_deutschland' &&
              oldQuestion.mainSkill === 'leben_test' &&
              oldQuestion.usageCategory === 'state_specific' &&
              oldQuestion.state
            ) {
              const state = oldQuestion.state;
              const newQuestions = questionsByState.get(state);

              if (newQuestions && newQuestions.length > 0) {
                // البحث عن سؤال جديد بنفس الـ prompt (إن أمكن)
                let newQuestion = newQuestions.find(
                  (q: any) => q.prompt === oldQuestion.prompt
                );

                // إذا لم نجد سؤال بنفس الـ prompt، نأخذ أول سؤال من نفس الولاية
                if (!newQuestion) {
                  newQuestion = newQuestions[0];
                }

                if (newQuestion) {
                  console.log(`   🔄 Replacing question in exam ${exam._id}:`);
                  console.log(`      Old: ${oldQuestion.prompt?.substring(0, 50)}...`);
                  console.log(`      New: ${newQuestion.prompt?.substring(0, 50)}...`);
                  
                  examUpdated = true;
                  totalQuestionsReplaced++;
                  updatedItems.push({
                    ...item,
                    questionId: newQuestion._id
                  });
                  continue;
                }
              }
            }

            // إذا لم يكن سؤال ولاية أو لم نجد بديل، نتركه كما هو
            updatedItems.push(item);
          } catch (error) {
            console.error(`   ⚠️  Error processing question ${item.questionId}:`, error);
            updatedItems.push(item); // في حالة الخطأ، نتركه كما هو
          }
        }

        updatedSections.push({
          ...section,
          items: updatedItems
        });
      }

      if (examUpdated) {
        await examsCollection.updateOne(
          { _id: exam._id },
          { $set: { sections: updatedSections } }
        );
        updatedExamsCount++;
        console.log(`   ✅ Updated exam: ${exam._id}\n`);
      }
    }

    console.log(`\n✅ Update completed!`);
    console.log(`   - Updated ${updatedExamsCount} exams`);
    console.log(`   - Replaced ${totalQuestionsReplaced} old state questions with new ones`);

  } catch (error) {
    console.error('❌ Error updating exams:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  updateExamsStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { updateExamsStateQuestions };








