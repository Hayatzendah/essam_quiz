import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import axios from 'axios';

// إعدادات
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.deutsch-tests.com';
const JWT_TOKEN = process.env.JWT_TOKEN || ''; // يجب تعيين JWT token

// مجلدات الصور
const QUESTIONS_IMAGES_DIR = path.join(__dirname, '..', 'src', 'uploads', 'images', 'questions');
const STATES_IMAGES_DIR = path.join(__dirname, '..', 'src', 'uploads', 'images', 'ولايات');

async function uploadImage(imagePath: string, filename: string, isStateImage: boolean = false): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath), filename);

    const endpoint = isStateImage 
      ? `${API_BASE_URL}/uploads/image?folder=ولايات` 
      : `${API_BASE_URL}/uploads/image`;

    const response = await axios.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log(`✅ Uploaded: ${filename} -> ${response.data.imageUrl || response.data.url}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to upload ${filename}:`, error.response?.data || error.message);
    return false;
  }
}

async function uploadAllImages() {
  if (!JWT_TOKEN) {
    console.error('❌ JWT_TOKEN environment variable is required!');
    console.log('Usage: JWT_TOKEN=your_token npm run upload-images');
    process.exit(1);
  }

  console.log('🚀 Starting image upload...\n');

  // رفع صور الأسئلة العامة
  console.log('📁 Uploading general questions images...');
  if (fs.existsSync(QUESTIONS_IMAGES_DIR)) {
    const files = fs.readdirSync(QUESTIONS_IMAGES_DIR);
    const imageFiles = files.filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));
    
    for (const file of imageFiles) {
      const filePath = path.join(QUESTIONS_IMAGES_DIR, file);
      await uploadImage(filePath, file, false);
      // تأخير صغير لتجنب rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n📁 Uploading state questions images...');
  // رفع صور الولايات
  if (fs.existsSync(STATES_IMAGES_DIR)) {
    const files = fs.readdirSync(STATES_IMAGES_DIR);
    const imageFiles = files.filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));
    
    for (const file of imageFiles) {
      const filePath = path.join(STATES_IMAGES_DIR, file);
      await uploadImage(filePath, file, true);
      // تأخير صغير لتجنب rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n✅ Upload completed!');
}

uploadAllImages().catch(console.error);
