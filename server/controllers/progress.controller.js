const { pool } = require('../config/db');

const createGoal = async (req, res) => {
    const { title, description, category, targetDate } = req.body;
    const userId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO Goals (user_id, title, description, category, target_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, title, description, category, targetDate, 'not_started']
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Goal created successfully',
            goalId: result.insertId
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to create goal' 
        });
    }
};

const getMyGoals = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const [goals] = await pool.query(
            `SELECT g.goal_id, g.title, g.description, g.category, g.target_date, g.status, g.created_at, g.completed_at,
            (SELECT COUNT(*) FROM Goal_Milestones WHERE goal_id = g.goal_id) as total_milestones,
            (SELECT COUNT(*) FROM Goal_Milestones WHERE goal_id = g.goal_id AND completed = TRUE) as completed_milestones
            FROM Goals g
            WHERE g.user_id = ?
            ORDER BY 
                CASE g.status 
                    WHEN 'in_progress' THEN 1
                    WHEN 'not_started' THEN 2
                    WHEN 'completed' THEN 3
                    WHEN 'abandoned' THEN 4
                END,
                g.target_date ASC`,
            [userId]
        );
        
        res.json({
            status: 'success',
            goals
        });
    } catch (error) {
        console.error('Get my goals error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch goals' 
        });
    }
};

const getGoalById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [goals] = await pool.query(
            'SELECT * FROM Goals WHERE goal_id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (goals.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Goal not found' 
            });
        }
        
        const [milestones] = await pool.query(
            'SELECT * FROM Goal_Milestones WHERE goal_id = ? ORDER BY milestone_id ASC',
            [id]
        );
        
        const [updates] = await pool.query(
            'SELECT * FROM Progress_Updates WHERE goal_id = ? ORDER BY created_at DESC',
            [id]
        );
        
        res.json({
            status: 'success',
            goal: goals[0],
            milestones,
            updates
        });
    } catch (error) {
        console.error('Get goal by ID error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch goal details' 
        });
    }
};

const updateGoal = async (req, res) => {
    const { id } = req.params;
    const { title, description, category, targetDate, status } = req.body;
    const userId = req.user.userId;
    
    try {
        const [goals] = await pool.query(
            'SELECT * FROM Goals WHERE goal_id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (goals.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Goal not found' 
            });
        }
        
        const completedAt = status === 'completed' ? new Date() : null;
        
        await pool.query(
            'UPDATE Goals SET title = ?, description = ?, category = ?, target_date = ?, status = ?, completed_at = ? WHERE goal_id = ?',
            [title, description, category, targetDate, status, completedAt, id]
        );
        
        res.json({
            status: 'success',
            message: 'Goal updated successfully'
        });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update goal' 
        });
    }
};

const deleteGoal = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'DELETE FROM Goals WHERE goal_id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Goal not found' 
            });
        }
        
        res.json({
            status: 'success',
            message: 'Goal deleted successfully'
        });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete goal' 
        });
    }
};

const addMilestone = async (req, res) => {
    const { goalId, title, description } = req.body;
    const userId = req.user.userId;
    
    try {
        const [goals] = await pool.query(
            'SELECT * FROM Goals WHERE goal_id = ? AND user_id = ?',
            [goalId, userId]
        );
        
        if (goals.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Goal not found' 
            });
        }
        
        const [result] = await pool.query(
            'INSERT INTO Goal_Milestones (goal_id, title, description) VALUES (?, ?, ?)',
            [goalId, title, description]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Milestone added successfully',
            milestoneId: result.insertId
        });
    } catch (error) {
        console.error('Add milestone error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to add milestone' 
        });
    }
};

const toggleMilestone = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [milestones] = await pool.query(
            `SELECT gm.*, g.user_id FROM Goal_Milestones gm
            JOIN Goals g ON gm.goal_id = g.goal_id
            WHERE gm.milestone_id = ? AND g.user_id = ?`,
            [id, userId]
        );
        
        if (milestones.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Milestone not found' 
            });
        }
        
        const milestone = milestones[0];
        const newCompleted = !milestone.completed;
        const completedAt = newCompleted ? new Date() : null;
        
        await pool.query(
            'UPDATE Goal_Milestones SET completed = ?, completed_at = ? WHERE milestone_id = ?',
            [newCompleted, completedAt, id]
        );
        
        res.json({
            status: 'success',
            message: 'Milestone updated successfully'
        });
    } catch (error) {
        console.error('Toggle milestone error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update milestone' 
        });
    }
};

const deleteMilestone = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            `DELETE gm FROM Goal_Milestones gm
            JOIN Goals g ON gm.goal_id = g.goal_id
            WHERE gm.milestone_id = ? AND g.user_id = ?`,
            [id, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Milestone not found' 
            });
        }
        
        res.json({
            status: 'success',
            message: 'Milestone deleted successfully'
        });
    } catch (error) {
        console.error('Delete milestone error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete milestone' 
        });
    }
};

const addProgressUpdate = async (req, res) => {
    const { goalId, notes } = req.body;
    const userId = req.user.userId;
    
    try {
        const [goals] = await pool.query(
            'SELECT * FROM Goals WHERE goal_id = ? AND user_id = ?',
            [goalId, userId]
        );
        
        if (goals.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Goal not found' 
            });
        }
        
        const [result] = await pool.query(
            'INSERT INTO Progress_Updates (goal_id, notes) VALUES (?, ?)',
            [goalId, notes]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Progress update added successfully',
            updateId: result.insertId
        });
    } catch (error) {
        console.error('Add progress update error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to add progress update' 
        });
    }
};

const getProgressStats = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const [totalGoals] = await pool.query(
            'SELECT COUNT(*) as count FROM Goals WHERE user_id = ?',
            [userId]
        );
        
        const [completedGoals] = await pool.query(
            'SELECT COUNT(*) as count FROM Goals WHERE user_id = ? AND status = "completed"',
            [userId]
        );
        
        const [inProgressGoals] = await pool.query(
            'SELECT COUNT(*) as count FROM Goals WHERE user_id = ? AND status = "in_progress"',
            [userId]
        );
        
        const [totalMilestones] = await pool.query(
            `SELECT COUNT(*) as count FROM Goal_Milestones gm
            JOIN Goals g ON gm.goal_id = g.goal_id
            WHERE g.user_id = ?`,
            [userId]
        );
        
        const [completedMilestones] = await pool.query(
            `SELECT COUNT(*) as count FROM Goal_Milestones gm
            JOIN Goals g ON gm.goal_id = g.goal_id
            WHERE g.user_id = ? AND gm.completed = TRUE`,
            [userId]
        );
        
        const [categoryBreakdown] = await pool.query(
            'SELECT category, COUNT(*) as count FROM Goals WHERE user_id = ? GROUP BY category',
            [userId]
        );
        
        res.json({
            status: 'success',
            stats: {
                totalGoals: totalGoals[0].count,
                completedGoals: completedGoals[0].count,
                inProgressGoals: inProgressGoals[0].count,
                totalMilestones: totalMilestones[0].count,
                completedMilestones: completedMilestones[0].count,
                categoryBreakdown
            }
        });
    } catch (error) {
        console.error('Get progress stats error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch progress statistics' 
        });
    }
};

module.exports = {
    createGoal,
    getMyGoals,
    getGoalById,
    updateGoal,
    deleteGoal,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    addProgressUpdate,
    getProgressStats
};