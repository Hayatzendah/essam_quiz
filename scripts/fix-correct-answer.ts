import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function fixCorrectAnswer() {
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

    // البحث عن جميع أسئلة MCQ التي لا تحتوي على correctAnswer أو correctAnswer فارغ
    const questionsWithoutCorrectAnswer = await questionsCollection.find({
      qType: 'mcq',
      $or: [
        { correctAnswer: { $exists: false } },
        { correctAnswer: '' },
        { correctAnswer: null }
      ],
      options: { $exists: true, $ne: [] }
    }).toArray();

    console.log(`📊 Found ${questionsWithoutCorrectAnswer.length} MCQ questions without correctAnswer\n`);

    if (questionsWithoutCorrectAnswer.length === 0) {
      console.log('✅ All questions already have correctAnswer!');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const question of questionsWithoutCorrectAnswer) {
      try {
        // البحث عن الخيار الصحيح
        const correctOption = question.options?.find((opt: any) => opt.isCorrect === true);
        
        if (correctOption && correctOption.text) {
          // تحديث السؤال
          await questionsCollection.updateOne(
            { _id: question._id },
            { $set: { correctAnswer: correctOption.text } }
          );
          updated++;
          console.log(`✅ Updated question ${question._id}: "${question.prompt?.substring(0, 50)}..." -> correctAnswer: "${correctOption.text}"`);
        } else {
          console.log(`⚠️  Question ${question._id} has no correct option: "${question.prompt?.substring(0, 50)}..."`);
          errors++;
        }
      } catch (error) {
        console.error(`❌ Error updating question ${question._id}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Total: ${questionsWithoutCorrectAnswer.length}`);

    // التحقق من الأسئلة الخاصة بالولايات
    const stateQuestions = await questionsCollection.find({
      provider: 'leben_in_deutschland',
      mainSkill: 'leben_test',
      usageCategory: 'state_specific',
      qType: 'mcq'
    }).toArray();

    const stateQuestionsWithoutCorrectAnswer = stateQuestions.filter(q => !q.correctAnswer || q.correctAnswer === '');

    console.log(`\n📋 State-specific questions:`);
    console.log(`   - Total: ${stateQuestions.length}`);
    console.log(`   - Without correctAnswer: ${stateQuestionsWithoutCorrectAnswer.length}`);

    if (stateQuestionsWithoutCorrectAnswer.length > 0) {
      console.log(`\n⚠️  Some state questions still missing correctAnswer. Fixing them...`);
      for (const question of stateQuestionsWithoutCorrectAnswer) {
        const correctOption = question.options?.find((opt: any) => opt.isCorrect === true);
        if (correctOption && correctOption.text) {
          await questionsCollection.updateOne(
            { _id: question._id },
            { $set: { correctAnswer: correctOption.text } }
          );
          console.log(`   ✅ Fixed: ${question._id}`);
        }
      }
    }

    console.log('\n✅ Fix completed!');
  } catch (error) {
    console.error('❌ Error fixing questions:', error);
    throw error;
  } finally {
    console.log('👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  fixCorrectAnswer()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixCorrectAnswer };












