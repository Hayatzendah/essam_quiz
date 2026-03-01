// Script to fix exams with empty sections
// Usage: node fix-empty-sections.js <examId> [defaultQuota]

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

async function fixEmptySections(examIdStr, defaultQuota = 5) {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const examsCollection = db.collection('exams');

    // Validate examId
    if (!ObjectId.isValid(examIdStr)) {
      console.error(`❌ Invalid exam ID: ${examIdStr}`);
      process.exit(1);
    }

    const examId = new ObjectId(examIdStr);

    // Fetch exam
    console.log(`\n🔍 Fetching exam: ${examIdStr}`);
    const exam = await examsCollection.findOne({ _id: examId });

    if (!exam) {
      console.error(`❌ Exam not found: ${examIdStr}`);
      process.exit(1);
    }

    console.log(`✅ Exam found: "${exam.title}"`);
    console.log(`   Level: ${exam.level || 'N/A'}`);
    console.log(`   Provider: ${exam.provider || 'N/A'}`);
    console.log(`   Status: ${exam.status || 'N/A'}`);
    console.log(`   Sections count: ${exam.sections?.length || 0}`);

    // Check sections
    if (!Array.isArray(exam.sections) || exam.sections.length === 0) {
      console.error(`❌ Exam has no sections`);
      process.exit(1);
    }

    let hasChanges = false;
    const updatedSections = exam.sections.map((s, index) => {
      if (!s || s === null) {
        console.log(`\n⚠️  Section ${index + 1} is null - will be fixed`);
        hasChanges = true;
        return {
          name: `Section ${index + 1}`,
          quota: defaultQuota,
          tags: [],
        };
      }

      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasQuota = typeof s.quota === 'number' && s.quota > 0;

      if (!hasItems && !hasQuota) {
        console.log(`\n⚠️  Section "${s.name || `Section ${index + 1}`}" is empty:`);
        console.log(`   - items: ${s.items?.length || 0}`);
        console.log(`   - quota: ${s.quota || 0}`);
        console.log(`   → Will add quota: ${defaultQuota}`);
        hasChanges = true;
        return {
          ...s,
          quota: defaultQuota,
        };
      }

      return s;
    });

    if (!hasChanges) {
      console.log(`\n✅ All sections are valid. No changes needed.`);
      return;
    }

    // Update exam
    console.log(`\n📝 Updating exam...`);
    const result = await examsCollection.updateOne(
      { _id: examId },
      {
        $set: {
          sections: updatedSections,
          updatedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 1) {
      console.log(`\n✅ Exam updated successfully!`);
      console.log(`\n📋 Updated sections:`);
      updatedSections.forEach((s, index) => {
        const hasItems = Array.isArray(s.items) && s.items.length > 0;
        const hasQuota = typeof s.quota === 'number' && s.quota > 0;
        console.log(`   ${index + 1}. "${s.name || `Section ${index + 1}`}"`);
        console.log(`      - items: ${s.items?.length || 0}`);
        console.log(`      - quota: ${s.quota || 0}`);
        console.log(`      - status: ${hasItems || hasQuota ? '✅ Valid' : '❌ Invalid'}`);
      });
    } else {
      console.error(`❌ Failed to update exam`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

// Get examId from command line
const examId = process.argv[2];
const defaultQuota = parseInt(process.argv[3]) || 5;

if (!examId) {
  console.error('❌ Usage: node fix-empty-sections.js <examId> [defaultQuota]');
  console.error('   Example: node fix-empty-sections.js 6926380f721cf4b27545857e 5');
  process.exit(1);
}

fixEmptySections(examId, defaultQuota);

