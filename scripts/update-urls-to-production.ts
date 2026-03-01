import { connect, disconnect, connection } from 'mongoose';

const ATLAS_URI = 'mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?appName=Cluster0';

const OLD_URL = 'http://localhost:4000';
const NEW_URL = 'https://api.deutsch-tests.com';

async function updateUrlsToProduction() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connect(ATLAS_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const questionsCollection = db.collection('questions');

    // البحث عن جميع الأسئلة اللي فيها localhost URLs
    console.log('🔍 Searching for questions with localhost URLs...\n');

    const questionsWithLocalhost = await questionsCollection.find({
      $or: [
        { 'media.url': { $regex: 'localhost' } },
        { 'images.url': { $regex: 'localhost' } }
      ]
    }).toArray();

    console.log(`📊 Found ${questionsWithLocalhost.length} questions with localhost URLs\n`);

    if (questionsWithLocalhost.length === 0) {
      console.log('✅ No questions need updating!');
      return;
    }

    let updatedCount = 0;

    // تحديث كل سؤال
    for (const question of questionsWithLocalhost) {
      const updates: any = {};

      // تحديث media.url إذا كان موجود
      if (question.media && question.media.url && question.media.url.includes('localhost')) {
        updates['media.url'] = question.media.url.replace(OLD_URL, NEW_URL);
        console.log(`📝 Question ${question._id}:`);
        console.log(`   Old media URL: ${question.media.url}`);
        console.log(`   New media URL: ${updates['media.url']}`);
      }

      // تحديث images array إذا كان موجود
      if (question.images && Array.isArray(question.images) && question.images.length > 0) {
        const updatedImages = question.images.map((img: any) => {
          if (img && img.url && img.url.includes('localhost')) {
            return {
              ...img,
              url: img.url.replace(OLD_URL, NEW_URL)
            };
          }
          return img;
        });

        updates['images'] = updatedImages;
        console.log(`📝 Question ${question._id}:`);
        console.log(`   Updating ${question.images.length} images in images array`);
      }

      // تنفيذ التحديث
      if (Object.keys(updates).length > 0) {
        await questionsCollection.updateOne(
          { _id: question._id },
          { $set: updates }
        );
        updatedCount++;
        console.log(`✅ Updated question ${question._id}\n`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} questions`);
    console.log(`📝 Changed all URLs from: ${OLD_URL}`);
    console.log(`📝 To: ${NEW_URL}`);

  } catch (error) {
    console.error('❌ Error updating URLs:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB Atlas...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB Atlas');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  updateUrlsToProduction()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { updateUrlsToProduction };
