// Script to delete attempts for deleted exams
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({}, { strict: false });
const attemptSchema = new mongoose.Schema({}, { strict: false });

const Exam = mongoose.model('Exam', examSchema);
const Attempt = mongoose.model('Attempt', attemptSchema);

async function deleteOrphanAttempts() {
  try {
    // Get all exam IDs
    const exams = await Exam.find({}).select('_id').lean();
    const examIds = exams.map((e: any) => e._id.toString());

    console.log(`\n📋 Found ${examIds.length} valid exam(s)`);

    // Find all attempts
    const attempts = await Attempt.find({}).lean();
    console.log(`📋 Found ${attempts.length} attempt(s)\n`);
    console.log('=' .repeat(80));

    let deletedCount = 0;

    for (const attempt of attempts) {
      const a = attempt as any;
      const examId = a.exam ? a.exam.toString() : null;

      if (!examId) {
        console.log(`\n🗑️  Deleting attempt ${a._id} - no exam ID`);
        await Attempt.deleteOne({ _id: a._id });
        deletedCount++;
        continue;
      }

      if (!examIds.includes(examId)) {
        console.log(`\n🗑️  Deleting attempt ${a._id}`);
        console.log(`   Student: ${a.student || 'unknown'}`);
        console.log(`   Exam (deleted): ${examId}`);
        console.log(`   Status: ${a.status || 'unknown'}`);

        await Attempt.deleteOne({ _id: a._id });
        deletedCount++;
        console.log('=' .repeat(80));
      }
    }

    console.log(`\n✅ Summary: Deleted ${deletedCount} orphan attempt(s)`);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  const mongoUri = process.env.MONGO_URI || process.argv[2];

  if (!mongoUri) {
    console.error('❌ MONGO_URI required');
    process.exit(1);
  }

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  await deleteOrphanAttempts();

  await mongoose.disconnect();
  console.log('\n👋 Done');
}

main();
