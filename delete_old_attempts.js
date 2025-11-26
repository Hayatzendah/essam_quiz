// سكريبت لحذف المحاولات القديمة من MongoDB
// استخدم: node delete_old_attempts.js

const { MongoClient } = require('mongodb');

// ⚠️ غيّر هذه القيم حسب إعداداتك
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-backend';
const DB_NAME = process.env.DB_NAME || 'quiz-backend';

async function deleteOldAttempts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const attemptsCollection = db.collection('attempts');
    
    // خيار 1: حذف جميع المحاولات
    console.log('\n🗑️  حذف جميع المحاولات...');
    const deleteAllResult = await attemptsCollection.deleteMany({});
    console.log(`✅ تم حذف ${deleteAllResult.deletedCount} محاولة`);
    
    // خيار 2: حذف محاولات تحتوي على questionId محدد (إذا أردت)
    // const questionIdsToDelete = [
    //   'QUESTION_ID_1',
    //   'QUESTION_ID_2',
    //   'QUESTION_ID_3'
    // ];
    // 
    // console.log('\n🗑️  حذف المحاولات التي تحتوي على أسئلة محددة...');
    // const deleteByQuestionResult = await attemptsCollection.deleteMany({
    //   'items.questionId': { $in: questionIdsToDelete.map(id => new ObjectId(id)) }
    // });
    // console.log(`✅ تم حذف ${deleteByQuestionResult.deletedCount} محاولة`);
    
    // خيار 3: حذف محاولات قبل تاريخ محدد
    // const beforeDate = new Date('2025-01-01');
    // console.log('\n🗑️  حذف المحاولات قبل تاريخ محدد...');
    // const deleteByDateResult = await attemptsCollection.deleteMany({
    //   createdAt: { $lt: beforeDate }
    // });
    // console.log(`✅ تم حذف ${deleteByDateResult.deletedCount} محاولة`);
    
    console.log('\n✅ تم الانتهاء!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// تشغيل السكريبت
deleteOldAttempts();




