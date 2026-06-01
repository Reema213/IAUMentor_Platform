const express = require('express');
const router = express.Router();
const { bookSession, getMySessions, updateSessionStatus, cancelSession, submitFeedback, getPendingBookings } = require('../controllers/session.controller');
const { verifyToken, isMentor } = require('../middleware/auth');

router.post('/book', verifyToken, bookSession);
router.get('/my', verifyToken, getMySessions);
router.put('/:id/status', verifyToken, isMentor, updateSessionStatus);
router.delete('/:id', verifyToken, cancelSession);
router.post('/feedback', verifyToken, submitFeedback);
router.get('/pending', verifyToken, isMentor, getPendingBookings);

module.exports = router;