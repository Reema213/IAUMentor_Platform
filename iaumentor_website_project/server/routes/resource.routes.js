const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadResource, getAllResources, getResourceById, searchResources, getMyResources, rateResource, deleteResource, reportResource } = require('../controllers/resource.controller');
const { verifyToken } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/resources/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only documents, spreadsheets, presentations, archives, and images are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

router.post('/upload', verifyToken, upload.single('file'), uploadResource);
router.get('/', getAllResources);
router.get('/search', searchResources);
router.get('/my', verifyToken, getMyResources);
router.get('/:id', getResourceById);
router.post('/rate', verifyToken, rateResource);
router.delete('/:id', verifyToken, deleteResource);
router.post('/report', verifyToken, reportResource);

module.exports = router;