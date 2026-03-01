const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Apply authentication
router.use(authenticateToken);

// Ensure upload directory exists locally
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Multer for disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: Content Hub & Media Management
 */

/**
 * @swagger
 * /content/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of posts
 *   post:
 *     summary: Create a new post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Post created
 */
router.get('/posts', contentController.getPosts);
router.post('/posts', contentController.createPost);
router.put('/posts/:id', contentController.updatePost);
router.delete('/posts/:id', contentController.deletePost);

/**
 * @swagger
 * /content/calendar:
 *   get:
 *     summary: Get calendar posts
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar posts
 */
router.get('/calendar', contentController.getCalendar);

/**
 * @swagger
 * /content/upload:
 *   post:
 *     summary: Upload media
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Media uploaded
 */
router.post('/upload', upload.single('media'), contentController.uploadMedia);

module.exports = router;
