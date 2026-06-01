const { pool } = require('../config/db');

const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.role, p.bio, p.interests, p.contact,
            (SELECT COUNT(*) FROM Session_Bookings WHERE mentee_id = u.user_id OR mentor_id = u.user_id) as total_sessions,
            (SELECT COUNT(*) FROM Resources WHERE owner_id = u.user_id) as total_resources,
            (SELECT COUNT(*) FROM Events WHERE organizer_id = u.user_id) as total_events
            FROM Users u
            LEFT JOIN Profiles p ON u.user_id = p.user_id
            ORDER BY u.user_id DESC`
        );
        
        res.json({
            status: 'success',
            users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch users' 
        });
    }
};

const updateUserRole = async (req, res) => {
    const { userId, role } = req.body;
    
    try {
        await pool.query(
            'UPDATE Users SET role = ? WHERE user_id = ?',
            [role, userId]
        );
        
        res.json({
            status: 'success',
            message: 'User role updated successfully'
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update user role' 
        });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('DELETE FROM Users WHERE user_id = ?', [id]);
        
        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete user' 
        });
    }
};

const getReports = async (req, res) => {
    try {
        const [reports] = await pool.query(
            `SELECT cr.report_id, cr.target_type, cr.target_id, cr.reason, cr.status, cr.created_at,
            u.name as reporter_name, u.email as reporter_email
            FROM Content_Reports cr
            JOIN Users u ON cr.reporter_id = u.user_id
            ORDER BY cr.created_at DESC`
        );
        
        for (let report of reports) {
            if (report.target_type === 'resource') {
                const [resources] = await pool.query(
                    'SELECT title, owner_id FROM Resources WHERE resource_id = ?',
                    [report.target_id]
                );
                if (resources.length > 0) {
                    report.target_title = resources[0].title;
                    report.target_owner_id = resources[0].owner_id;
                }
            } else if (report.target_type === 'message') {
                const [messages] = await pool.query(
                    'SELECT body, sender_id FROM Messages WHERE message_id = ?',
                    [report.target_id]
                );
                if (messages.length > 0) {
                    report.target_title = messages[0].body.substring(0, 50) + '...';
                    report.target_owner_id = messages[0].sender_id;
                }
            }
        }
        
        res.json({
            status: 'success',
            reports
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch reports' 
        });
    }
};

const updateReportStatus = async (req, res) => {
    const { reportId, status } = req.body;
    
    try {
        await pool.query(
            'UPDATE Content_Reports SET status = ? WHERE report_id = ?',
            [status, reportId]
        );
        
        res.json({
            status: 'success',
            message: 'Report status updated successfully'
        });
    } catch (error) {
        console.error('Update report status error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update report status' 
        });
    }
};

const deleteReportedContent = async (req, res) => {
    const { reportId } = req.body;
    
    try {
        const [reports] = await pool.query(
            'SELECT target_type, target_id FROM Content_Reports WHERE report_id = ?',
            [reportId]
        );
        
        if (reports.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Report not found' 
            });
        }
        
        const report = reports[0];
        
        if (report.target_type === 'resource') {
            await pool.query('DELETE FROM Resources WHERE resource_id = ?', [report.target_id]);
        } else if (report.target_type === 'message') {
            await pool.query('DELETE FROM Messages WHERE message_id = ?', [report.target_id]);
        }
        
        await pool.query(
            'UPDATE Content_Reports SET status = ? WHERE report_id = ?',
            ['closed', reportId]
        );
        
        res.json({
            status: 'success',
            message: 'Content deleted successfully'
        });
    } catch (error) {
        console.error('Delete reported content error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete content' 
        });
    }
};

const createAnnouncement = async (req, res) => {
    const { title, body, startAt, endAt } = req.body;
    const createdBy = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO Announcements (created_by, title, body, start_at, end_at) VALUES (?, ?, ?, ?, ?)',
            [createdBy, title, body, startAt, endAt]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Announcement created successfully',
            announcementId: result.insertId
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to create announcement' 
        });
    }
};

const getAnnouncements = async (req, res) => {
    try {
        const [announcements] = await pool.query(
            `SELECT a.announce_id, a.title, a.body, a.start_at, a.end_at,
            u.name as creator_name
            FROM Announcements a
            JOIN Users u ON a.created_by = u.user_id
            ORDER BY a.start_at DESC`
        );
        
        res.json({
            status: 'success',
            announcements
        });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch announcements' 
        });
    }
};

const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('DELETE FROM Announcements WHERE announce_id = ?', [id]);
        
        res.json({
            status: 'success',
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete announcement' 
        });
    }
};

const getSystemStats = async (req, res) => {
    try {
        const [userStats] = await pool.query(
            'SELECT role, COUNT(*) as count FROM Users GROUP BY role'
        );
        
        const [sessionStats] = await pool.query(
            'SELECT status, COUNT(*) as count FROM Session_Bookings GROUP BY status'
        );
        
        const [resourceStats] = await pool.query(
            'SELECT COUNT(*) as total FROM Resources'
        );
        
        const [eventStats] = await pool.query(
            'SELECT COUNT(*) as total FROM Events WHERE status = "active"'
        );
        
        const [messageStats] = await pool.query(
            'SELECT COUNT(*) as total FROM Messages'
        );
        
        const [reportStats] = await pool.query(
            'SELECT status, COUNT(*) as count FROM Content_Reports GROUP BY status'
        );
        
        res.json({
            status: 'success',
            stats: {
                users: userStats,
                sessions: sessionStats,
                resources: resourceStats[0].total,
                events: eventStats[0].total,
                messages: messageStats[0].total,
                reports: reportStats
            }
        });
    } catch (error) {
        console.error('Get system stats error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch system statistics' 
        });
    }
};

module.exports = {
    getAllUsers,
    updateUserRole,
    deleteUser,
    getReports,
    updateReportStatus,
    deleteReportedContent,
    createAnnouncement,
    getAnnouncements,
    deleteAnnouncement,
    getSystemStats
};