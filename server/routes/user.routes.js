const express = require('express');
const router = express.Router();
const { updateProfile, changePassword, deleteAccount, getDashboardStats, getRecentActivity } = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth');

router.put('/profile', verifyToken, updateProfile);
router.put('/password', verifyToken, changePassword);
router.delete('/account', verifyToken, deleteAccount);
router.get('/dashboard/stats', verifyToken, getDashboardStats);
router.get('/dashboard/activity', verifyToken, getRecentActivity);

module.exports = router;