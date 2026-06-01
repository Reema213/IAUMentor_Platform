const express = require('express');
const router = express.Router();
const { getAllMentors, getMentorById, searchMentors, addAvailability, getMentorAvailability, deleteAvailability } = require('../controllers/mentor.controller');
const { verifyToken, isMentor } = require('../middleware/auth');

router.get('/', getAllMentors);
router.get('/search', searchMentors);
router.get('/:id', getMentorById);
router.post('/availability', verifyToken, isMentor, addAvailability);
router.get('/availability/my', verifyToken, isMentor, getMentorAvailability);
router.delete('/availability/:id', verifyToken, isMentor, deleteAvailability);

module.exports = router;