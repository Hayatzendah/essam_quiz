const fs = require('fs');
const path = require('path');

// إعدادات
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.deutsch-tests.com';
const JWT_TOKEN = process.env.JWT_TOKEN;

if (!JWT_TOKEN) {
  console.error('❌ JWT_TOKEN environment variable is required!');
  console.log('Usage: JWT_TOKEN=your_token node upload-all-images.js');
  process.exit(1);
}

// مجلدات الصور
const QUESTIONS_IMAGES_DIR = path.join(__dirname, 'src', 'uploads', 'images', 'questions');
const STATES_IMAGES_DIR = path.join(__dirname, 'src', 'uploads', 'images', 'ولايات');

async function uploadImage(imagePath, filename, isStateImage = false) {
  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, filename);

    const endpoint = isStateImage 
      ? `${API_BASE_URL}/uploads/image?folder=ولايات` 
      : `${API_BASE_URL}/uploads/image`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Uploaded: ${filename} -> ${data.imageUrl || 'OK'}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${filename}:`, error.message);
    return false;
  }
}

async function uploadAllImages() {
  console.log('🚀 Starting image upload...\n');

  let successCount = 0;
  let failCount = 0;

  // رفع صور الأسئلة العامة
  console.log('📁 Uploading general questions images...');
  if (fs.existsSync(QUESTIONS_IMAGES_DIR)) {
    const files = fs.readdirSync(QUESTIONS_IMAGES_DIR);
    const imageFiles = files.filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));
    
    for (const file of imageFiles) {
      const filePath = path.join(QUESTIONS_IMAGES_DIR, file);
      const success = await uploadImage(filePath, file, false);
      if (success) successCount++;
      else failCount++;
      // تأخير صغير لتجنب rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log('\n📁 Uploading state questions images...');
  // رفع صور الولايات
  if (fs.existsSync(STATES_IMAGES_DIR)) {
    const files = fs.readdirSync(STATES_IMAGES_DIR);
    const imageFiles = files.filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));
    
    for (const file of imageFiles) {
      const filePath = path.join(STATES_IMAGES_DIR, file);
      const success = await uploadImage(filePath, file, true);
      if (success) successCount++;
      else failCount++;
      // تأخير صغير لتجنب rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`\n✅ Upload completed!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

uploadAllImages().catch(console.error);
