import * as fs from 'fs';
import * as path from 'path';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
const JWT_TOKEN = process.env.JWT_TOKEN || ''; // يجب أن تحصل على token من login

// قائمة الصور المطلوبة
const requiredImages = [
  'سؤال21عام.jpeg',
  'سؤال21عام.jpeg2.jpeg',
  'سؤال21عام.jpeg3.jpeg',
  'سؤال21عام.jpeg4.jpeg',
  'سؤال55عام.jpeg',
  'سؤال70عام.jpeg',
  'سؤال130عام.jpeg',
  'سؤال176عام.jpeg',
  'سؤال181عام.jpeg',
  'سؤال187عام.jpeg',
  'سؤال209عام.jpeg1.jpeg',
  'سؤال209عام.jpeg2.jpeg',
  'سؤال209عام.jpeg3.jpeg',
  'سؤال209عام.jpeg4.jpeg',
  'سؤال216عام.jpeg',
  '1سؤال226عام.jpeg',
  'سؤال226عام.jpeg2.jpeg',
  'سؤال226عام.jpeg3.jpeg',
  'سؤال226عام.jpeg4.jpeg',
  'سؤال235عام.jpeg',
];

async function uploadImage(imagePath: string, filename: string): Promise<boolean> {
  try {
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️  Image not found: ${imagePath}`);
      return false;
    }

    const fileBuffer = fs.readFileSync(imagePath);
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`),
      Buffer.from(`Content-Type: image/jpeg\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await fetch(`${API_BASE_URL}/uploads/image`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Uploaded: ${filename} -> ${data.imageUrl}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Failed to upload ${filename}: Status ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Failed to upload ${filename}: ${error.message}`);
    return false;
  }
}

async function uploadAllImages() {
  console.log('🚀 Starting image upload process...\n');
  console.log(`📡 API Base URL: ${API_BASE_URL}\n`);

  if (!JWT_TOKEN) {
    console.error('❌ JWT_TOKEN is required!');
    console.error('   Please set JWT_TOKEN environment variable or update the script.');
    console.error('   You can get a token by logging in as teacher/admin.');
    process.exit(1);
  }

  const imagesDir = path.join(process.cwd(), 'uploads', 'images', 'questions');
  
  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ Images directory not found: ${imagesDir}`);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  console.log(`📁 Found ${requiredImages.length} images to upload\n`);

  for (const filename of requiredImages) {
    const imagePath = path.join(imagesDir, filename);
    const success = await uploadImage(imagePath, filename);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    // انتظار قصير بين كل رفع لتجنب rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${requiredImages.length}`);

  if (failCount === 0) {
    console.log(`\n🎉 All images uploaded successfully!`);
  } else {
    console.log(`\n⚠️  Some images failed to upload. Please check the errors above.`);
  }
}

// تشغيل السكريبت
if (require.main === module) {
  uploadAllImages()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { uploadAllImages };

