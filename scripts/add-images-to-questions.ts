import * as fs from 'fs';
import * as path from 'path';

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
// استخدام PUBLIC_BASE_URL أولاً، ثم API_BASE_URL كـ fallback
const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || 'http://localhost:4000';

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

async function addImagesToQuestions() {
  try {
    const jsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-300-questions.json');
    console.log(`📖 Reading questions from: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data: QuestionsData = JSON.parse(fileContent);

    console.log(`📊 Found ${data.questions.length} questions in file\n`);

    let updatedCount = 0;

    // تحديث الأسئلة
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
          // إذا كان هناك صورة واحدة، نستخدم حقل media
          if (validImages.length === 1) {
            question.media = validImages[0];
            console.log(`✅ Added 1 image to question ${questionNumber}: ${imageFiles[0]}`);
          } else {
            // إذا كان هناك عدة صور، نستخدم حقل images
            question.images = validImages;
            // أيضاً نضيف الصورة الأولى في media للتوافق مع الكود القديم
            question.media = validImages[0];
            console.log(`✅ Added ${validImages.length} images to question ${questionNumber}`);
            console.log(`   📸 Images: ${imageFiles.join(', ')}`);
          }
          updatedCount++;
        }
      }
    }

    // حفظ الملف المحدث
    const updatedContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(jsonPath, updatedContent, 'utf-8');

    console.log(`\n✅ Successfully updated ${updatedCount} questions with images`);
    console.log(`📝 File saved: ${jsonPath}`);

  } catch (error) {
    console.error('❌ Error adding images to questions:', error);
    throw error;
  }
}

// تشغيل السكريبت
if (require.main === module) {
  addImagesToQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { addImagesToQuestions };

