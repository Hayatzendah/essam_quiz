/**
 * Migration script to normalize provider values in MongoDB
 * 
 * This script updates all exam and question documents to use normalized provider values
 * from ProviderEnum (case-insensitive normalization).
 * 
 * Usage:
 *   node scripts/migrate-provider-values.js
 * 
 * Or with MongoDB connection string:
 *   MONGODB_URI=mongodb://localhost:27017/quiz node scripts/migrate-provider-values.js
 */

const { MongoClient } = require('mongodb');

// ProviderEnum values (must match src/common/enums/provider.enum.ts)
const PROVIDER_ENUM_VALUES = {
  'goethe': 'goethe',
  'Goethe': 'goethe',
  'GOETHE': 'goethe',
  'telc': 'telc',
  'Telc': 'telc',
  'TELC': 'telc',
  'oesd': 'oesd',
  'Oesd': 'oesd',
  'OESD': 'oesd',
  'ecl': 'ecl',
  'Ecl': 'ecl',
  'ECL': 'ecl',
  'dtb': 'dtb',
  'Dtb': 'dtb',
  'DTB': 'dtb',
  'dtz': 'dtz',
  'Dtz': 'dtz',
  'DTZ': 'dtz',
  'Deutschland-in-Leben': 'Deutschland-in-Leben',
  'deutschland-in-leben': 'Deutschland-in-Leben',
  'DEUTSCHLAND-IN-LEBEN': 'Deutschland-in-Leben',
  'deutschland_in_leben': 'Deutschland-in-Leben',
  'leben_in_deutschland': 'leben_in_deutschland',
  'Leben-in-Deutschland': 'leben_in_deutschland',
  'LEBEN_IN_DEUTSCHLAND': 'leben_in_deutschland',
  'leben-in-deutschland': 'leben_in_deutschland',
  'Grammatik': 'Grammatik',
  'grammatik': 'Grammatik',
  'GRAMMATIK': 'Grammatik',
  'Wortschatz': 'Wortschatz',
  'wortschatz': 'Wortschatz',
  'WORTSCHATZ': 'Wortschatz',
};

function normalizeProvider(provider) {
  if (!provider || typeof provider !== 'string') return null;
  const trimmed = provider.trim();
  const normalized = trimmed.toLowerCase();
  
  // Direct match
  if (PROVIDER_ENUM_VALUES[trimmed]) {
    return PROVIDER_ENUM_VALUES[trimmed];
  }
  
  // Case-insensitive match
  for (const [key, value] of Object.entries(PROVIDER_ENUM_VALUES)) {
    if (key.toLowerCase() === normalized) {
      return value;
    }
  }
  
  // Special cases
  if (normalized === 'deutschland-in-leben' || normalized === 'deutschland_in_leben') {
    return 'Deutschland-in-Leben';
  }
  if (normalized === 'leben_in_deutschland' || normalized === 'leben-in-deutschland' || normalized === 'leben in deutschland') {
    return 'leben_in_deutschland';
  }
  if (normalized === 'grammatik' || normalized === 'grammar') {
    return 'Grammatik';
  }
  if (normalized === 'wortschatz' || normalized === 'vocabulary') {
    return 'Wortschatz';
  }
  
  return null;
}

async function migrateCollection(db, collectionName) {
  const collection = db.collection(collectionName);
  const documents = await collection.find({ provider: { $exists: true, $ne: null } }).toArray();
  
  console.log(`\n📋 Found ${documents.length} documents with provider in ${collectionName}`);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const doc of documents) {
    try {
      const currentProvider = doc.provider;
      const normalized = normalizeProvider(currentProvider);
      
      if (!normalized) {
        console.warn(`⚠️  Skipping ${collectionName}._id=${doc._id}: unknown provider "${currentProvider}"`);
        skipped++;
        continue;
      }
      
      if (normalized === currentProvider) {
        // Already normalized
        skipped++;
        continue;
      }
      
      await collection.updateOne(
        { _id: doc._id },
        { $set: { provider: normalized } }
      );
      
      console.log(`✅ Updated ${collectionName}._id=${doc._id}: "${currentProvider}" → "${normalized}"`);
      updated++;
    } catch (error) {
      console.error(`❌ Error updating ${collectionName}._id=${doc._id}:`, error.message);
      errors++;
    }
  }
  
  return { updated, skipped, errors };
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Migrate exams collection
    const examsResult = await migrateCollection(db, 'exams');
    console.log(`\n📊 Exams migration: ${examsResult.updated} updated, ${examsResult.skipped} skipped, ${examsResult.errors} errors`);
    
    // Migrate questions collection
    const questionsResult = await migrateCollection(db, 'questions');
    console.log(`\n📊 Questions migration: ${questionsResult.updated} updated, ${questionsResult.skipped} skipped, ${questionsResult.errors} errors`);
    
    // Migrate listeningclips collection
    const clipsResult = await migrateCollection(db, 'listeningclips');
    console.log(`\n📊 ListeningClips migration: ${clipsResult.updated} updated, ${clipsResult.skipped} skipped, ${clipsResult.errors} errors`);
    
    const totalUpdated = examsResult.updated + questionsResult.updated + clipsResult.updated;
    const totalSkipped = examsResult.skipped + questionsResult.skipped + clipsResult.skipped;
    const totalErrors = examsResult.errors + questionsResult.errors + clipsResult.errors;
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Total updated: ${totalUpdated}`);
    console.log(`   Total skipped: ${totalSkipped}`);
    console.log(`   Total errors: ${totalErrors}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

if (require.main === module) {
  main();
}

module.exports = { normalizeProvider, migrateCollection };

