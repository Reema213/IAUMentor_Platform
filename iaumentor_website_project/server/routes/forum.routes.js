const express = require('express');
const router = express.Router();
const { getCategories, getThreadsByCategory, createThread, getThreadById, createReply, voteContent, markAsSolution, deleteThread, searchThreads } = require('../controllers/forum.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/categories', getCategories);
router.get('/categories/:categoryId/threads', getThreadsByCategory);
router.post('/threads', verifyToken, createThread);
router.get('/threads/:id', getThreadById);
router.delete('/threads/:id', verifyToken, deleteThread);
router.post('/replies', verifyToken, createReply);
router.post('/vote', verifyToken, voteContent);
router.post('/solution', verifyToken, markAsSolution);
router.get('/search', searchThreads);

module.exports = router;