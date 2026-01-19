import { connect, disconnect, connection } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

/**
 * تحويل meaning string إلى meanings array
 * مثال: "بيت / house / maison" → [{text: "بيت", language: "ar"}, {text: "house", language: "en"}, {text: "maison", language: "fr"}]
 */
function parseMeaningString(meaning: string): Array<{ text: string; language: string }> {
  if (!meaning || typeof meaning !== 'string') {
    return [];
  }

  const parts = meaning.split('/').map((part) => part.trim()).filter((part) => part.length > 0);
  
  return parts.map((text, index) => {
    // محاولة تخمين اللغة من النص
    let language = 'unknown';
    
    // إذا كان النص يحتوي على أحرف عربية
    if (/[\u0600-\u06FF]/.test(text)) {
      language = 'ar';
    } else if (/^[a-zA-Z\s]+$/.test(text)) {
      // إذا كان النص إنجليزي فقط
      language = 'en';
    } else {
      // افتراض اللغة حسب الترتيب
      language = index === 0 ? 'ar' : index === 1 ? 'en' : 'fr';
    }

    return { text, language };
  });
}

async function migrateVocabularyMeanings() {
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

    console.log('🔍 Finding vocabulary words with old meaning format...');
    const wordsToMigrate = await vocabularyWordsCollection.find({
      meaning: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { meanings: { $exists: false } },
        { meanings: { $eq: [] } },
        { meanings: { $eq: null } },
      ],
    }).toArray();

    console.log(`📊 Found ${wordsToMigrate.length} words to migrate.\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const word of wordsToMigrate) {
      try {
        const oldMeaning = word.meaning;
        
        if (!oldMeaning || typeof oldMeaning !== 'string') {
          skippedCount++;
          console.log(`⏭️  Skipped word: ${word.word} (ID: ${word._id}) - meaning is not a string`);
          continue;
        }

        const newMeanings = parseMeaningString(oldMeaning);

        if (newMeanings.length === 0) {
          skippedCount++;
          console.log(`⏭️  Skipped word: ${word.word} (ID: ${word._id}) - no meanings extracted`);
          continue;
        }

        // Update the word
        await vocabularyWordsCollection.updateOne(
          { _id: word._id },
          {
            $set: {
              meanings: newMeanings,
            },
            // لا نحذف meaning للتوافق مع البيانات القديمة
          }
        );
        
        migratedCount++;
        console.log(`✅ Migrated word: ${word.word} (ID: ${word._id})`);
        console.log(`   Old meaning: "${oldMeaning}"`);
        console.log(`   New meanings: ${JSON.stringify(newMeanings)}`);
      } catch (error: any) {
        console.error(`❌ Error migrating word ${word._id}: ${error.message}`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`📊 Total words processed: ${wordsToMigrate.length}`);
    console.log(`📊 Words successfully migrated: ${migratedCount}`);
    console.log(`📊 Words skipped: ${skippedCount}`);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

migrateVocabularyMeanings();
