const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, deleteUser, getReports, updateReportStatus, deleteReportedContent, createAnnouncement, getAnnouncements, deleteAnnouncement, getSystemStats } = require('../controllers/admin.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/users', verifyToken, isAdmin, getAllUsers);
router.put('/users/role', verifyToken, isAdmin, updateUserRole);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);
router.get('/reports', verifyToken, isAdmin, getReports);
router.put('/reports/status', verifyToken, isAdmin, updateReportStatus);
router.post('/reports/delete-content', verifyToken, isAdmin, deleteReportedContent);
router.post('/announcements', verifyToken, isAdmin, createAnnouncement);
router.get('/announcements', getAnnouncements);
router.delete('/announcements/:id', verifyToken, isAdmin, deleteAnnouncement);
router.get('/stats', verifyToken, isAdmin, getSystemStats);

module.exports = router;