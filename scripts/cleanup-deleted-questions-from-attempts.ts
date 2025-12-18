import { connect, connection, Collection, ObjectId } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quiz';

interface AttemptItem {
  questionId: ObjectId;
  qType: string;
  answerKeyMatch?: [string, string][];
  matchPairs?: Array<{ left: string; right: string }>;
  [key: string]: any;
}

interface Attempt {
  _id: ObjectId;
  items: AttemptItem[];
  [key: string]: any;
}

interface Question {
  _id: ObjectId;
  qType: string;
  answerKeyMatch?: [string, string][];
  [key: string]: any;
}

async function cleanupDeletedQuestionsFromAttempts() {
  if (!MONGODB_URI) {
    console.error('❌ MONGO_URI is not defined. Please set it in your environment variables.');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = connection.db;
    const attemptsCollection: Collection<Attempt> = db.collection('attempts');
    const questionsCollection: Collection<Question> = db.collection('questions');

    // جلب جميع المحاولات
    const attempts = await attemptsCollection.find({}).toArray();
    console.log(`📊 Found ${attempts.length} attempts to check`);

    let updatedAttempts = 0;
    let removedItems = 0;
    let fixedItems = 0;

    for (const attempt of attempts) {
      if (!attempt.items || !Array.isArray(attempt.items)) {
        continue;
      }

      let attemptNeedsUpdate = false;
      const updatedItems: AttemptItem[] = [];
      const questionIdsToCheck: ObjectId[] = [];

      // جمع جميع questionIds للتحقق منها
      attempt.items.forEach((item: AttemptItem) => {
        if (item.questionId) {
          questionIdsToCheck.push(new ObjectId(item.questionId));
        }
      });

      // التحقق من وجود الأسئلة في قاعدة البيانات
      const existingQuestions = await questionsCollection
        .find({ _id: { $in: questionIdsToCheck } })
        .toArray();
      
      const existingQuestionIds = new Set(
        existingQuestions.map((q: Question) => String(q._id))
      );

      // معالجة كل item
      for (const item of attempt.items) {
        const questionIdStr = String(item.questionId);
        const questionExists = existingQuestionIds.has(questionIdStr);

        if (!questionExists) {
          // السؤال محذوف
          console.log(`  ⚠️  Question ${questionIdStr} in attempt ${attempt._id} was deleted from DB`);
          
          // إذا كان match question بدون pairs، نحذفه من المحاولة
          if (item.qType === 'match' && !item.answerKeyMatch && !item.matchPairs) {
            console.log(`  ❌ Removing deleted match question ${questionIdStr} (no pairs in snapshot)`);
            removedItems++;
            attemptNeedsUpdate = true;
            continue; // تخطي هذا item
          }
          
          // إذا كان match question مع pairs في snapshot، نبقيه
          if (item.qType === 'match' && (item.answerKeyMatch || item.matchPairs)) {
            console.log(`  ✅ Keeping deleted match question ${questionIdStr} (has pairs in snapshot)`);
            updatedItems.push(item);
            continue;
          }
          
          // للأنواع الأخرى، نبقيهم (قد يكون لديهم بيانات في snapshot)
          updatedItems.push(item);
          attemptNeedsUpdate = true;
        } else {
          // السؤال موجود - التحقق من match questions بدون pairs
          if (item.qType === 'match' && !item.answerKeyMatch && !item.matchPairs) {
            // محاولة استرجاع answerKeyMatch من السؤال الأصلي
            const originalQuestion = existingQuestions.find(
              (q: Question) => String(q._id) === questionIdStr
            );
            
            if (originalQuestion && originalQuestion.answerKeyMatch && Array.isArray(originalQuestion.answerKeyMatch) && originalQuestion.answerKeyMatch.length > 0) {
              // إضافة answerKeyMatch و matchPairs إلى snapshot
              item.answerKeyMatch = originalQuestion.answerKeyMatch;
              item.matchPairs = originalQuestion.answerKeyMatch.map(([left, right]: [string, string]) => ({
                left,
                right,
              }));
              console.log(`  ✅ Fixed match question ${questionIdStr} in attempt ${attempt._id} - added ${item.answerKeyMatch.length} pairs from original question`);
              fixedItems++;
              attemptNeedsUpdate = true;
            } else {
              console.log(`  ⚠️  Match question ${questionIdStr} in attempt ${attempt._id} has no pairs in snapshot or original question`);
            }
          }
          
          updatedItems.push(item);
        }
      }

      // تحديث المحاولة إذا لزم الأمر
      if (attemptNeedsUpdate) {
        await attemptsCollection.updateOne(
          { _id: attempt._id },
          { $set: { items: updatedItems } }
        );
        updatedAttempts++;
        console.log(`✅ Updated attempt ${attempt._id}`);
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Summary:`);
    console.log(`- Attempts processed: ${attempts.length}`);
    console.log(`- Attempts updated: ${updatedAttempts}`);
    console.log(`- Items removed: ${removedItems}`);
    console.log(`- Items fixed: ${fixedItems}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

cleanupDeletedQuestionsFromAttempts().catch(console.error);

