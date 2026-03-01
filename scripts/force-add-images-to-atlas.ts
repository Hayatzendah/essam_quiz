import { connect, disconnect, connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

const ATLAS_URI = 'mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?appName=Cluster0';

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

// Base URL للصور
const BASE_URL = 'https://api.deutsch-tests.com';

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

async function forceAddImagesToAtlas() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connect(ATLAS_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

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
    let notFoundCount = 0;

    // تحديث الأسئلة في MongoDB - بدون تحقق، فقط إضافة مباشرة
    for (let i = 0; i < data.questions.length; i++) {
      const questionNumber = i + 1;
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

        // جمع جميع الصور
        for (const imageFile of imageFiles) {
          validImages.push({
            type: 'image',
            key: `images/questions/${imageFile}`,
            url: getImageUrl(imageFile),
            mime: getMimeType(imageFile),
            provider: 's3'
          });
        }

        if (validImages.length > 0) {
          const setData: any = {};

          // إذا كان هناك صورة واحدة
          if (validImages.length === 1) {
            setData.media = validImages[0];
            console.log(`📝 Question ${questionNumber}: Adding 1 image to media`);
          } else {
            // إذا كان هناك عدة صور
            setData.images = validImages;
            setData.media = validImages[0];
            console.log(`📝 Question ${questionNumber}: Adding ${validImages.length} images to images array`);
          }

          // البحث عن السؤال
          const query = {
            prompt: question.prompt,
            provider: question.provider || 'leben_in_deutschland',
            mainSkill: question.mainSkill || 'leben_test'
          };

          // تحديث مباشر بدون أي تحقق
          const updateResult = await questionsCollection.updateOne(
            query,
            { $set: setData }
          );

          if (updateResult.matchedCount > 0) {
            console.log(`✅ Updated question ${questionNumber}`);
            if (validImages.length > 1) {
              console.log(`   📸 Images: ${imageFiles.join(', ')}`);
            }
            updatedCount++;
          } else {
            console.log(`⚠️  Question ${questionNumber} not found in Atlas`);
            console.log(`   Prompt: "${question.prompt.substring(0, 50)}..."`);
            notFoundCount++;
          }
        }
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} questions with images in Atlas`);
    if (notFoundCount > 0) {
      console.log(`⚠️  ${notFoundCount} questions not found in Atlas`);
    }

  } catch (error) {
    console.error('❌ Error adding images to Atlas:', error);
    throw error;
  } finally {
    console.log('\n👋 Disconnecting from MongoDB Atlas...');
    await disconnect();
    console.log('✅ Disconnected from MongoDB Atlas');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  forceAddImagesToAtlas()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { forceAddImagesToAtlas };
