import { connect, disconnect, connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

interface Question {
  prompt: string;
  qType: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  provider?: string;
  mainSkill?: string;
  usageCategory?: string;
  state?: string;
  level?: string;
  status?: string;
  tags?: string[];
  media?: {
    type: string;
    key: string;
    url: string;
    mime: string;
    provider: string;
  };
  images?: Array<{
    type: string;
    key: string;
    url: string;
    mime: string;
    provider: string;
  }>;
}

interface QuestionsData {
  questions: Question[];
}

// Mapping بين أرقام الأسئلة والصور
const questionImages: { [key: number]: string[] } = {
  21: ['سؤال21عام.jpeg', 'سؤال21عام.jpeg2.jpeg', 'سؤال21عام.jpeg3.jpeg', 'سؤال21عام.jpeg4.jpeg'],
  55: ['سؤال55عام.jpeg'],
  70: ['سؤال70عام.jpeg'],
  130: ['سؤال130عام.jpeg'],
  176: ['سؤال176عام.jpeg'],
  181: ['سؤال181عام.jpeg'],
  187: ['سؤال187عام.jpeg'],
  209: ['سؤال209عام.jpeg1.jpeg', 'سؤال209عام.jpeg2.jpeg', 'سؤال209عام.jpeg3.jpeg', 'سؤال209عام.jpeg4.jpeg'],
  216: ['سؤال216عام.jpeg'],
  226: ['1سؤال226عام.jpeg', 'سؤال226عام.jpeg2.jpeg', 'سؤال226عام.jpeg3.jpeg', 'سؤال226عام.jpeg4.jpeg'],
  235: ['سؤال235عام.jpeg'],
};

// Base URL للصور (يمكن تغييره حسب البيئة)
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

function getImageUrl(filename: string): string {
  return `${BASE_URL}/uploads/images/questions/${filename}`;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg'; // default
}

async function addImagesToMongoDB() {
  if (!MONGODB_URI) {
    console.error('❌ MONGO_URI or MONGODB_URI is not defined. Please set it in your environment variables.');
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

    const questionsCollection = db.collection('questions');

    // قراءة ملف JSON
    const jsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-300-questions.json');
    console.log(`📖 Reading questions from: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data: QuestionsData = JSON.parse(fileContent);

    console.log(`📊 Found ${data.questions.length} questions in file\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // تحديث الأسئلة في MongoDB
    for (let i = 0; i < data.questions.length; i++) {
      const questionNumber = i + 1; // رقم السؤال (1-based)
      const question = data.questions[i];

      if (questionImages[questionNumber]) {
        const imageFiles = questionImages[questionNumber];
        const validImages: Array<{
          type: string;
          key: string;
          url: string;
          mime: string;
          provider: string;
        }> = [];

        // جمع جميع الصور الصحيحة
        for (const imageFile of imageFiles) {
          const imagePath = path.join(process.cwd(), 'uploads', 'images', 'questions', imageFile);
          
          if (fs.existsSync(imagePath)) {
            validImages.push({
              type: 'image',
              key: `images/questions/${imageFile}`,
              url: getImageUrl(imageFile),
              mime: getMimeType(imageFile),
              provider: 's3'
            });
          } else {
            console.log(`⚠️  Image not found for question ${questionNumber}: ${imagePath}`);
          }
        }

        if (validImages.length > 0) {
          // البحث عن السؤال في MongoDB باستخدام prompt
          const setData: any = {};
          const unsetData: any = {};

          // إذا كان هناك صورة واحدة، نستخدم حقل media
          if (validImages.length === 1) {
            setData.media = validImages[0];
            unsetData.images = ''; // حذف images إذا كان موجوداً
          } else {
            // إذا كان هناك عدة صور، نستخدم حقل images
            setData.images = validImages;
            // أيضاً نضيف الصورة الأولى في media للتوافق مع الكود القديم
            setData.media = validImages[0];
          }

          // البحث عن السؤال باستخدام prompt و provider و mainSkill
          const query = {
            prompt: question.prompt,
            provider: question.provider || 'leben_in_deutschland',
            mainSkill: question.mainSkill || 'leben_test'
          };

          // بناء update object
          const updateObj: any = {};
          if (Object.keys(setData).length > 0) {
            updateObj.$set = setData;
          }
          if (Object.keys(unsetData).length > 0) {
            updateObj.$unset = unsetData;
          }

          const updateResult = await questionsCollection.updateOne(
            query,
            updateObj
          );

          if (updateResult.matchedCount > 0) {
            if (updateResult.modifiedCount > 0) {
              console.log(`✅ Updated question ${questionNumber} with ${validImages.length} image(s)`);
              if (validImages.length > 1) {
                console.log(`   📸 Images: ${imageFiles.join(', ')}`);
              }
              updatedCount++;
            } else {
              console.log(`ℹ️  Question ${questionNumber} already has images (no changes needed)`);
              skippedCount++;
            }
          } else {
            console.log(`⚠️  Question ${questionNumber} not found in MongoDB: "${question.prompt.substring(0, 50)}..."`);
          }
        }
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} questions with images`);
    if (skippedCount > 0) {
      console.log(`ℹ️  Skipped ${skippedCount} questions (already have images)`);
    }

  } catch (error) {
    console.error('❌ Error adding images to MongoDB:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  addImagesToMongoDB()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { addImagesToMongoDB };

