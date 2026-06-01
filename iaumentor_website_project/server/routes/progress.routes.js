const express = require('express');
const router = express.Router();
const { createGoal, getMyGoals, getGoalById, updateGoal, deleteGoal, addMilestone, toggleMilestone, deleteMilestone, addProgressUpdate, getProgressStats } = require('../controllers/progress.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/goals', verifyToken, createGoal);
router.get('/goals', verifyToken, getMyGoals);
router.get('/goals/:id', verifyToken, getGoalById);
router.put('/goals/:id', verifyToken, updateGoal);
router.delete('/goals/:id', verifyToken, deleteGoal);
router.post('/milestones', verifyToken, addMilestone);
router.put('/milestones/:id/toggle', verifyToken, toggleMilestone);
router.delete('/milestones/:id', verifyToken, deleteMilestone);
router.post('/updates', verifyToken, addProgressUpdate);
router.get('/stats', verifyToken, getProgressStats);

module.exports = router;