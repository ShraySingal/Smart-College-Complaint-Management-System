const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

let storage;

// Check if Cloudinary is configured
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

const useDiskStorage = () => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    });
    console.log('📁 Fallback: Using local DiskStorage for media.');
};

if (isCloudinaryConfigured) {
    try {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        storage = new CloudinaryStorage({
            cloudinary: cloudinary,
            params: async (req, file) => ({
                folder: 'college_complaints',
                resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
                public_id: 'comp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            }),
        });
        console.log('☁️ Using Cloudinary for media storage.');
    } catch (err) {
        console.error('❌ Cloudinary Config Failed:', err.message);
        useDiskStorage();
    }
} else {
    // Fallback to local storage (Manual setup requirement solved)
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
    console.log('📁 Using local DiskStorage for media (Cloudinary keys missing).');
}

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // Increase to 20MB
});

module.exports = upload;
