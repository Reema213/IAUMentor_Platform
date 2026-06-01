const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

const updateProfile = async (req, res) => {
    const { name, bio, interests, contact } = req.body;
    const userId = req.user.userId;
    
    try {
        await pool.query(
            'UPDATE Users SET name = ? WHERE user_id = ?',
            [name, userId]
        );
        
        await pool.query(
            'UPDATE Profiles SET bio = ?, interests = ?, contact = ? WHERE user_id = ?',
            [bio, interests, contact, userId]
        );
        
        res.json({
            status: 'success',
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update profile' 
        });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    try {
        const [users] = await pool.query('SELECT password_hash FROM Users WHERE user_id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'User not found' 
            });
        }
        
        const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
        
        if (!isValid) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Current password is incorrect' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            'UPDATE Users SET password_hash = ? WHERE user_id = ?',
            [hashedPassword, userId]
        );
        
        res.json({
            status: 'success',
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to change password' 
        });
    }
};

const deleteAccount = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        await pool.query('DELETE FROM Users WHERE user_id = ?', [userId]);
        
        res.clearCookie('token');
        
        res.json({
            status: 'success',
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete account' 
        });
    }
};

const getDashboardStats = async (req, res) => {
    const userId = req.user.userId;
    const role = req.user.role;
    
    try {
        let stats = {};
        
        if (role === 'mentee') {
            const [sessions] = await pool.query(
                'SELECT COUNT(*) as count FROM Session_Bookings WHERE mentee_id = ?',
                [userId]
            );
            
            const [resources] = await pool.query(
                'SELECT COUNT(*) as count FROM Resources'
            );
            
            const [events] = await pool.query(
                'SELECT COUNT(*) as count FROM Event_Registrations WHERE user_id = ?',
                [userId]
            );
            
            stats = {
                totalSessions: sessions[0].count,
                availableResources: resources[0].count,
                registeredEvents: events[0].count
            };
        } else if (role === 'mentor') {
            const [sessions] = await pool.query(
                'SELECT COUNT(*) as count FROM Session_Bookings WHERE mentor_id = ?',
                [userId]
            );
            
            const [resources] = await pool.query(
                'SELECT COUNT(*) as count FROM Resources WHERE owner_id = ?',
                [userId]
            );
            
            const [feedback] = await pool.query(
                'SELECT AVG(rating) as avgRating FROM Mentor_Feedback mf JOIN Session_Bookings sb ON mf.booking_id = sb.booking_id WHERE sb.mentor_id = ?',
                [userId]
            );
            
            stats = {
                totalSessions: sessions[0].count,
                uploadedResources: resources[0].count,
                averageRating: feedback[0].avgRating || 0
            };
        }
        
        res.json({
            status: 'success',
            stats
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch dashboard stats' 
        });
    }
};

const getRecentActivity = async (req, res) => {
    const userId = req.user.userId;
    const role = req.user.role;
    
    try {
        let activity = [];
        
        if (role === 'mentee') {
            const [sessions] = await pool.query(
                'SELECT sb.*, u.name as mentor_name, a.start_time FROM Session_Bookings sb JOIN Users u ON sb.mentor_id = u.user_id JOIN Availability_Slots a ON sb.slot_id = a.slot_id WHERE sb.mentee_id = ? ORDER BY sb.created_at DESC LIMIT 5',
                [userId]
            );
            activity = sessions;
        } else if (role === 'mentor') {
            const [sessions] = await pool.query(
                'SELECT sb.*, u.name as mentee_name, a.start_time FROM Session_Bookings sb JOIN Users u ON sb.mentee_id = u.user_id JOIN Availability_Slots a ON sb.slot_id = a.slot_id WHERE sb.mentor_id = ? ORDER BY sb.created_at DESC LIMIT 5',
                [userId]
            );
            activity = sessions;
        }
        
        res.json({
            status: 'success',
            activity
        });
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch recent activity' 
        });
    }
};

module.exports = {
    updateProfile,
    changePassword,
    deleteAccount,
    getDashboardStats,
    getRecentActivity
};