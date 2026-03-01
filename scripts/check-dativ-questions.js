// Script to check if dativ questions exist in MongoDB
// Usage: node scripts/check-dativ-questions.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-db';

async function checkDativQuestions() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const questionsCollection = db.collection('questions');

    // 1. Check for questions with tag "dativ"
    console.log('1️⃣ Checking for questions with tag "dativ"...');
    const dativCount = await questionsCollection.countDocuments({
      tags: { $in: ['dativ'] },
    });
    console.log(`   Found ${dativCount} questions with tag "dativ"\n`);

    // 2. Check for questions with tag "dativ" and level "A1"
    console.log('2️⃣ Checking for questions with tag "dativ" and level "A1"...');
    const dativA1Count = await questionsCollection.countDocuments({
      tags: { $in: ['dativ'] },
      level: 'A1',
    });
    console.log(`   Found ${dativA1Count} questions with tag "dativ" and level "A1"\n`);

    // 3. Check for questions with tag "akkusativ" (for comparison)
    console.log('3️⃣ Checking for questions with tag "akkusativ" (for comparison)...');
    const akkusativCount = await questionsCollection.countDocuments({
      tags: { $in: ['akkusativ'] },
    });
    console.log(`   Found ${akkusativCount} questions with tag "akkusativ"\n`);

    // 4. List all unique tags
    console.log('4️⃣ Listing all unique tags in questions collection...');
    const tagsAggregation = await questionsCollection
      .aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();
    
    console.log('   Tags found:');
    tagsAggregation.forEach((tag) => {
      console.log(`   - "${tag._id}": ${tag.count} questions`);
    });
    console.log('');

    // 5. Check grammar topics for dativ
    console.log('5️⃣ Checking grammar topics for "dativ"...');
    const grammarTopicsCollection = db.collection('grammartopics');
    const dativTopic = await grammarTopicsCollection.findOne({
      slug: 'dativ',
      level: 'A1',
    });
    
    if (dativTopic) {
      console.log(`   Found grammar topic: "${dativTopic.title}"`);
      console.log(`   Tags: ${JSON.stringify(dativTopic.tags || [])}`);
      console.log(`   examId: ${dativTopic.examId || 'null'}\n`);
    } else {
      console.log('   ❌ No grammar topic found for slug="dativ", level="A1"\n');
    }

    // 6. Check exams related to dativ
    console.log('6️⃣ Checking exams related to dativ...');
    const examsCollection = db.collection('exams');
    const dativExams = await examsCollection
      .find({
        $or: [
          { slug: 'dativ' },
          { grammarTopicId: dativTopic?._id },
          { 'sections.tags': { $in: ['dativ'] } },
        ],
      })
      .toArray();
    
    console.log(`   Found ${dativExams.length} exams related to dativ`);
    dativExams.forEach((exam, idx) => {
      console.log(`   ${idx + 1}. ${exam.title} (ID: ${exam._id})`);
    });
    console.log('');

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   - Dativ questions: ${dativCount} (A1: ${dativA1Count})`);
    console.log(`   - Akkusativ questions: ${akkusativCount} (for comparison)`);
    console.log(`   - Dativ grammar topic: ${dativTopic ? 'Found' : 'Not found'}`);
    console.log(`   - Dativ exams: ${dativExams.length}`);
    
    if (dativA1Count === 0) {
      console.log('\n   ⚠️  WARNING: No dativ questions found for level A1!');
      console.log('   This will cause "NO_QUESTIONS_FOUND" error when starting a practice attempt.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

checkDativQuestions();

