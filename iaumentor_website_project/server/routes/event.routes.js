const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventById, registerForEvent, unregisterFromEvent, getMyEvents, getMyOrganizedEvents, updateEvent, cancelEvent } = require('../controllers/event.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, createEvent);
router.get('/', getAllEvents);
router.get('/my', verifyToken, getMyEvents);
router.get('/organized', verifyToken, getMyOrganizedEvents);
router.get('/:id', getEventById);
router.post('/register', verifyToken, registerForEvent);
router.delete('/register/:id', verifyToken, unregisterFromEvent);
router.put('/:id', verifyToken, updateEvent);
router.delete('/:id', verifyToken, cancelEvent);

module.exports = router;