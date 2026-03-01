const fs = require('fs');
const path = require('path');

// إعدادات
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.deutsch-tests.com';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL || process.env.EMAIL;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || process.env.PASSWORD;

// مجلدات الصور
const STATES_IMAGES_DIR = path.join(__dirname, 'uploads', 'images', 'ولايات');

async function getJWTToken() {
  if (!TEACHER_EMAIL || !TEACHER_PASSWORD) {
    console.error('❌ TEACHER_EMAIL and TEACHER_PASSWORD are required!');
    console.log('Usage: TEACHER_EMAIL=email TEACHER_PASSWORD=password node upload-state-images.js');
    console.log('Or set EMAIL and PASSWORD environment variables');
    process.exit(1);
  }

  try {
    console.log('🔐 Getting JWT token...');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEACHER_EMAIL,
        password: TEACHER_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Got JWT token');
    return data.accessToken;
  } catch (error) {
    console.error('❌ Failed to get JWT token:', error.message);
    process.exit(1);
  }
}

async function uploadImage(imagePath, filename, jwtToken) {
  try {
    // قراءة الملف وتحويله إلى base64
    const fileBuffer = fs.readFileSync(imagePath);
    const base64 = fileBuffer.toString('base64');

    const endpoint = `${API_BASE_URL}/uploads/image-from-base64?folder=ولايات`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        filename: filename,
        base64: base64,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Uploaded: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${filename}:`, error.message);
    return false;
  }
}

async function uploadAllStateImages() {
  console.log('🚀 Starting state images upload...\n');

  // الحصول على JWT token
  const jwtToken = await getJWTToken();
  console.log('');

  let successCount = 0;
  let failCount = 0;

  // رفع صور الولايات
  console.log('📁 Uploading state questions images...');
  if (fs.existsSync(STATES_IMAGES_DIR)) {
    const files = fs.readdirSync(STATES_IMAGES_DIR);
    const imageFiles = files.filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));
    
    console.log(`Found ${imageFiles.length} images to upload\n`);
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const filePath = path.join(STATES_IMAGES_DIR, file);
      console.log(`[${i + 1}/${imageFiles.length}] Uploading ${file}...`);
      const success = await uploadImage(filePath, file, jwtToken);
      if (success) successCount++;
      else failCount++;
      // تأخير صغير لتجنب rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } else {
    console.error(`❌ Directory not found: ${STATES_IMAGES_DIR}`);
    process.exit(1);
  }

  console.log(`\n✅ Upload completed!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

uploadAllStateImages().catch(console.error);



