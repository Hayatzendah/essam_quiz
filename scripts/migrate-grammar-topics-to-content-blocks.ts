/**
 * Migration Script: Convert Grammar Topics to Content Blocks
 * 
 * يحول البيانات القديمة (intro, image, table, youtube) إلى contentBlocks array
 * 
 * ⚠️ مهم: هذا script اختياري - يمكن تشغيله لتحويل البيانات القديمة
 */

import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

interface OldGrammarTopic {
  _id: any;
  intro?: string;
  image?: string | { url: string; alt?: string; caption?: string };
  table?: { title?: string; headers: string[]; rows: string[][] };
  youtube?: string | { videoId: string; title?: string };
  contentHtml?: string;
  contentBlocks?: any[];
}

async function migrateGrammarTopicsToContentBlocks() {
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

    const topicsCollection = db.collection('grammartopics');

    // جلب جميع المواضيع
    const allTopics = await topicsCollection.find({}).toArray();

    console.log(`📊 Total grammar topics: ${allTopics.length}\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const topic of allTopics) {
      const topicId = topic._id.toString();
      const oldTopic = topic as OldGrammarTopic;

      // تخطي إذا كان contentBlocks موجوداً بالفعل
      if (oldTopic.contentBlocks && Array.isArray(oldTopic.contentBlocks) && oldTopic.contentBlocks.length > 0) {
        skippedCount++;
        continue;
      }

      const contentBlocks: any[] = [];
      let blockIndex = 0;

      // 1. Convert intro
      if (oldTopic.intro && typeof oldTopic.intro === 'string' && oldTopic.intro.trim()) {
        contentBlocks.push({
          id: `block-${Date.now()}-${blockIndex++}`,
          type: 'intro',
          data: {
            text: oldTopic.intro.trim(),
          },
        });
      }

      // 2. Convert image
      if (oldTopic.image) {
        if (typeof oldTopic.image === 'string') {
          contentBlocks.push({
            id: `block-${Date.now()}-${blockIndex++}`,
            type: 'image',
            data: {
              url: oldTopic.image,
            },
          });
        } else if (typeof oldTopic.image === 'object' && oldTopic.image.url) {
          contentBlocks.push({
            id: `block-${Date.now()}-${blockIndex++}`,
            type: 'image',
            data: {
              url: oldTopic.image.url,
              alt: oldTopic.image.alt || '',
              caption: oldTopic.image.caption || '',
            },
          });
        }
      }

      // 3. Convert table
      if (oldTopic.table && typeof oldTopic.table === 'object') {
        if (oldTopic.table.headers && Array.isArray(oldTopic.table.headers) && oldTopic.table.rows && Array.isArray(oldTopic.table.rows)) {
          contentBlocks.push({
            id: `block-${Date.now()}-${blockIndex++}`,
            type: 'table',
            data: {
              title: oldTopic.table.title || '',
              headers: oldTopic.table.headers,
              rows: oldTopic.table.rows,
            },
          });
        }
      }

      // 4. Convert youtube
      if (oldTopic.youtube) {
        if (typeof oldTopic.youtube === 'string') {
          // Extract video ID from URL if it's a full URL
          let videoId = oldTopic.youtube;
          const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
          const match = oldTopic.youtube.match(youtubeRegex);
          if (match && match[1]) {
            videoId = match[1];
          }

          contentBlocks.push({
            id: `block-${Date.now()}-${blockIndex++}`,
            type: 'youtube',
            data: {
              videoId: videoId,
            },
          });
        } else if (typeof oldTopic.youtube === 'object' && oldTopic.youtube.videoId) {
          contentBlocks.push({
            id: `block-${Date.now()}-${blockIndex++}`,
            type: 'youtube',
            data: {
              videoId: oldTopic.youtube.videoId,
              title: oldTopic.youtube.title || '',
            },
          });
        }
      }

      // 5. Convert contentHtml to intro block if no other blocks exist
      if (contentBlocks.length === 0 && oldTopic.contentHtml && typeof oldTopic.contentHtml === 'string' && oldTopic.contentHtml.trim()) {
        contentBlocks.push({
          id: `block-${Date.now()}-${blockIndex++}`,
          type: 'intro',
          data: {
            text: oldTopic.contentHtml.trim(),
          },
        });
      }

      // تحديث الموضوع إذا كان هناك contentBlocks
      if (contentBlocks.length > 0) {
        try {
          await topicsCollection.updateOne(
            { _id: topic._id },
            {
              $set: {
                contentBlocks: contentBlocks,
              },
            },
          );
          migratedCount++;
          console.log(`✅ Migrated topic ${topicId}: ${contentBlocks.length} blocks`);
        } catch (error: any) {
          errors.push(`Failed to migrate topic ${topicId}: ${error.message}`);
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Migration completed!\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Total topics processed: ${allTopics.length}`);
    console.log(`   - Topics migrated: ${migratedCount}`);
    console.log(`   - Topics skipped: ${skippedCount}`);
    console.log(`   - Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors:`);
      errors.slice(0, 10).forEach((error) => console.log(`   - ${error}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// تشغيل الـ migration
if (require.main === module) {
  migrateGrammarTopicsToContentBlocks()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateGrammarTopicsToContentBlocks };
