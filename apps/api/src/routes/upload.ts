import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /upload — accepts base64 image, returns Cloudinary URL
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { image } = req.body as { image: string };

    if (!image) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      res.status(500).json({ error: 'Image upload not configured' });
      return;
    }

    // Upload to Cloudinary with auto-optimization
    const result = await cloudinary.uploader.upload(image, {
      folder: 'rift/listings',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      ],
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export default router;
