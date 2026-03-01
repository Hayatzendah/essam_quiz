import { connect, disconnect, connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

async function reverseVocabularyWordOrder() {
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

    const vocabularyWordsCollection = db.collection('vocabularywords');

    // Get all distinct topicIds
    console.log('🔍 Finding all vocabulary topics...');
    const topicIds = await vocabularyWordsCollection.distinct('topicId');
    console.log(`📊 Found ${topicIds.length} topics to process.\n`);

    const backup: Array<{ topicId: string; words: Array<{ _id: string; word: string; oldOrder: number | null }> }> = [];
    let totalWordsReversed = 0;
    let topicsProcessed = 0;
    let errors = 0;

    for (const topicId of topicIds) {
      try {
        // Fetch all words for this topic, sorted by current effective order:
        // Words with order field: sorted by order ASC
        // Words without order (null): sorted by createdAt ASC (oldest first)
        const words = await vocabularyWordsCollection
          .find({ topicId })
          .sort({ order: 1, createdAt: 1 })
          .toArray();

        // Sort in memory to handle nulls properly (put null-order words at the end, sorted by createdAt ASC)
        words.sort((a, b) => {
          const aOrder = a.order != null ? a.order : Infinity;
          const bOrder = b.order != null ? b.order : Infinity;
          if (aOrder !== bOrder) return aOrder - bOrder;
          // For words without order, sort by createdAt ASC (oldest first)
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });

        if (words.length === 0) continue;

        // Save backup for this topic
        const topicBackup = {
          topicId: topicId.toString(),
          words: words.map((w) => ({
            _id: w._id.toString(),
            word: w.word,
            oldOrder: w.order != null ? w.order : null,
          })),
        };
        backup.push(topicBackup);

        // Reverse the array
        const reversed = [...words].reverse();

        // Assign new sequential order values: 0, 1, 2, ...
        const bulkOps = reversed.map((w, index) => ({
          updateOne: {
            filter: { _id: w._id },
            update: { $set: { order: index } },
          },
        }));

        await vocabularyWordsCollection.bulkWrite(bulkOps);

        totalWordsReversed += words.length;
        topicsProcessed++;
        console.log(`✅ Topic ${topicId}: reversed ${words.length} words`);
      } catch (error: any) {
        errors++;
        console.error(`❌ Error processing topic ${topicId}: ${error.message}`);
      }
    }

    // Write backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `backup-word-order-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
    console.log(`\n💾 Backup saved to: ${backupPath}`);

    console.log(`\n✅ Reversal completed!`);
    console.log(`📊 Topics processed: ${topicsProcessed}`);
    console.log(`📊 Total words reversed: ${totalWordsReversed}`);
    if (errors > 0) {
      console.log(`⚠️  Errors: ${errors}`);
    }
  } catch (error: any) {
    console.error('❌ Reversal failed:', error.message);
    process.exit(1);
  } finally {
    await disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

reverseVocabularyWordOrder();
