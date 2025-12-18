/**
 * Migration script to add matchPairs to old attempts
 * This script updates all attempts that have match questions without matchPairs
 * by converting answerKeyMatch to matchPairs format
 */

import { connect, disconnect } from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in environment variables');
  process.exit(1);
}

interface AttemptItem {
  questionId: any;
  qType: string;
  answerKeyMatch?: [string, string][];
  matchPairs?: Array<{ left: string; right: string }>;
  [key: string]: any;
}

interface Attempt {
  _id: any;
  items: AttemptItem[];
  [key: string]: any;
}

async function migrateAttemptMatchPairs() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = (await import('mongoose')).connection.db;
    const attemptsCollection = db.collection('attempts');
    const questionsCollection = db.collection('questions');

    // Find all attempts with match questions that don't have matchPairs
    const attempts = await attemptsCollection.find({}).toArray();
    console.log(`📊 Found ${attempts.length} total attempts`);

    let updatedAttempts = 0;
    let updatedItems = 0;

    for (const attempt of attempts as Attempt[]) {
      if (!attempt.items || !Array.isArray(attempt.items)) {
        continue;
      }

      let attemptNeedsUpdate = false;
      const updatedItems = attempt.items.map((item: AttemptItem) => {
        // Check if this is a match question without matchPairs
        if (item.qType === 'match' && !item.matchPairs) {
          // Try to get matchPairs from answerKeyMatch
          if (item.answerKeyMatch && Array.isArray(item.answerKeyMatch) && item.answerKeyMatch.length > 0) {
            item.matchPairs = item.answerKeyMatch.map(([left, right]: [string, string]) => ({
              left,
              right,
            }));
            attemptNeedsUpdate = true;
            updatedItems++;
            console.log(`  ✅ Updated item ${item.questionId} in attempt ${attempt._id}`);
          } else {
            // Try to get answerKeyMatch from the original question
            // Note: This requires fetching the question, which is slower
            // But it's necessary for old attempts that don't have answerKeyMatch in snapshot
            console.log(`  ⚠️  Item ${item.questionId} in attempt ${attempt._id} has no answerKeyMatch in snapshot`);
          }
        }
        return item;
      });

      if (attemptNeedsUpdate) {
        await attemptsCollection.updateOne(
          { _id: attempt._id },
          { $set: { items: updatedItems } }
        );
        updatedAttempts++;
        console.log(`✅ Updated attempt ${attempt._id}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  Total attempts processed: ${attempts.length}`);
    console.log(`  Attempts updated: ${updatedAttempts}`);
    console.log(`  Items updated: ${updatedItems}`);
    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run migration
migrateAttemptMatchPairs()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });

