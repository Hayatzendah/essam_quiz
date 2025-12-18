/**
 * Script to fix a specific match question by adding answerKeyMatch
 * Usage: npx ts-node scripts/fix-match-question.ts <questionId>
 */

import { connect, disconnect, Types } from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in environment variables');
  process.exit(1);
}

const questionId = process.argv[2];

if (!questionId) {
  console.error('❌ Please provide a question ID');
  console.log('Usage: npx ts-node scripts/fix-match-question.ts <questionId>');
  process.exit(1);
}

async function fixMatchQuestion() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not set');
    }
    await connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = (await import('mongoose')).connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const questionsCollection = db.collection('questions');

    // Convert questionId to ObjectId
    let questionObjectId: Types.ObjectId;
    try {
      questionObjectId = new Types.ObjectId(questionId);
    } catch (error) {
      console.error(`❌ Invalid question ID format: ${questionId}`);
      process.exit(1);
    }

    // Find the question
    const question = await questionsCollection.findOne({ _id: questionObjectId });
    
    if (!question) {
      console.error(`❌ Question ${questionId} not found`);
      process.exit(1);
    }

    if (question.qType !== 'match') {
      console.error(`❌ Question ${questionId} is not a match question (qType: ${question.qType})`);
      process.exit(1);
    }

    if (question.answerKeyMatch && Array.isArray(question.answerKeyMatch) && question.answerKeyMatch.length > 0) {
      console.log(`✅ Question ${questionId} already has answerKeyMatch with ${question.answerKeyMatch.length} pairs`);
      console.log('answerKeyMatch:', JSON.stringify(question.answerKeyMatch, null, 2));
      process.exit(0);
    }

    // Example answerKeyMatch - replace with actual pairs
    const answerKeyMatch: [string, string][] = [
      ['I live in Germany', 'أنا أعيش في ألمانيا'],
      ['My name is Anna', 'اسمي آنا'],
    ];

    console.log(`\n📝 Adding answerKeyMatch to question ${questionId}...`);
    console.log('answerKeyMatch:', JSON.stringify(answerKeyMatch, null, 2));

    const result = await questionsCollection.updateOne(
      { _id: questionObjectId },
      { $set: { answerKeyMatch } }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Successfully updated question ${questionId}`);
      
      // Verify the update
      const updatedQuestion = await questionsCollection.findOne({ _id: questionObjectId });
      if (updatedQuestion && updatedQuestion.answerKeyMatch) {
        console.log(`✅ Verified: answerKeyMatch is now present with ${updatedQuestion.answerKeyMatch.length} pairs`);
      }
    } else {
      console.log(`⚠️  Question ${questionId} was not modified (may already have answerKeyMatch)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run script
fixMatchQuestion()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

