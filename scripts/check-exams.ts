import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function checkExams() {
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

    const examsCollection = db.collection('exams');
    const questionsCollection = db.collection('questions');

    // البحث عن جميع الامتحانات
    const allExams = await examsCollection.find({}).toArray();
    console.log(`📚 Total exams: ${allExams.length}\n`);

    if (allExams.length === 0) {
      console.log('ℹ️  No exams found in database.');
      return;
    }

    // البحث عن امتحانات Leben in Deutschland
    const lebenExams = await examsCollection.find({
      provider: { $regex: /leben|deutschland/i }
    }).toArray();

    console.log(`📋 Leben in Deutschland exams: ${lebenExams.length}\n`);

    // فحص كل امتحان
    for (const exam of lebenExams) {
      console.log(`\n📝 Exam: ${exam._id}`);
      console.log(`   Title: ${exam.title || 'N/A'}`);
      console.log(`   Provider: ${exam.provider || 'N/A'}`);
      console.log(`   Sections: ${exam.sections?.length || 0}`);

      if (exam.sections && Array.isArray(exam.sections)) {
        let stateQuestionsCount = 0;
        let totalQuestionsCount = 0;

        for (const section of exam.sections) {
          if (section.items && Array.isArray(section.items)) {
            totalQuestionsCount += section.items.length;

            for (const item of section.items) {
              if (item.questionId) {
                try {
                  const question = await questionsCollection.findOne({
                    _id: item.questionId
                  });

                  if (question) {
                    if (
                      question.provider === 'leben_in_deutschland' &&
                      question.mainSkill === 'leben_test' &&
                      question.usageCategory === 'state_specific'
                    ) {
                      stateQuestionsCount++;
                      console.log(`      ⚠️  State question found: ${question.state || 'N/A'} - ${question.prompt?.substring(0, 40)}...`);
                    }
                  }
                } catch (error) {
                  // ignore
                }
              }
            }
          }
        }

        console.log(`   Total questions: ${totalQuestionsCount}`);
        console.log(`   State-specific questions: ${stateQuestionsCount}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking exams:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  checkExams()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkExams };





