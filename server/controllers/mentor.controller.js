const { pool } = require('../config/db');

const getAllMentors = async (req, res) => {
    try {
        const [mentors] = await pool.query(
            `SELECT u.user_id, u.name, u.email, p.bio, p.interests, p.contact,
            (SELECT AVG(mf.rating) FROM Mentor_Feedback mf 
             JOIN Session_Bookings sb ON mf.booking_id = sb.booking_id 
             WHERE sb.mentor_id = u.user_id) as avg_rating,
            (SELECT COUNT(*) FROM Session_Bookings sb WHERE sb.mentor_id = u.user_id) as total_sessions
            FROM Users u 
            LEFT JOIN Profiles p ON u.user_id = p.user_id 
            WHERE u.role = 'mentor'
            ORDER BY avg_rating DESC`
        );
        
        res.json({
            status: 'success',
            mentors
        });
    } catch (error) {
        console.error('Get all mentors error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch mentors' 
        });
    }
};

const getMentorById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [mentors] = await pool.query(
            `SELECT u.user_id, u.name, u.email, p.bio, p.interests, p.contact,
            (SELECT AVG(mf.rating) FROM Mentor_Feedback mf 
             JOIN Session_Bookings sb ON mf.booking_id = sb.booking_id 
             WHERE sb.mentor_id = u.user_id) as avg_rating,
            (SELECT COUNT(*) FROM Session_Bookings sb WHERE sb.mentor_id = u.user_id) as total_sessions
            FROM Users u 
            LEFT JOIN Profiles p ON u.user_id = p.user_id 
            WHERE u.user_id = ? AND u.role = 'mentor'`,
            [id]
        );
        
        if (mentors.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Mentor not found' 
            });
        }
        
        const [availability] = await pool.query(
            `SELECT slot_id, start_time, duration, status 
            FROM Availability_Slots 
            WHERE mentor_id = ? AND status = 'available' AND start_time > NOW()
            ORDER BY start_time ASC`,
            [id]
        );
        
        const [feedback] = await pool.query(
            `SELECT mf.rating, mf.comments, mf.created_at, u.name as mentee_name
            FROM Mentor_Feedback mf
            JOIN Session_Bookings sb ON mf.booking_id = sb.booking_id
            JOIN Users u ON sb.mentee_id = u.user_id
            WHERE sb.mentor_id = ?
            ORDER BY mf.created_at DESC
            LIMIT 10`,
            [id]
        );
        
        res.json({
            status: 'success',
            mentor: mentors[0],
            availability,
            feedback
        });
    } catch (error) {
        console.error('Get mentor by ID error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch mentor details' 
        });
    }
};

const searchMentors = async (req, res) => {
    const { query } = req.query;
    
    try {
        const searchTerm = `%${query}%`;
        const [mentors] = await pool.query(
            `SELECT u.user_id, u.name, u.email, p.bio, p.interests, p.contact,
            (SELECT AVG(mf.rating) FROM Mentor_Feedback mf 
             JOIN Session_Bookings sb ON mf.booking_id = sb.booking_id 
             WHERE sb.mentor_id = u.user_id) as avg_rating,
            (SELECT COUNT(*) FROM Session_Bookings sb WHERE sb.mentor_id = u.user_id) as total_sessions
            FROM Users u 
            LEFT JOIN Profiles p ON u.user_id = p.user_id 
            WHERE u.role = 'mentor' 
            AND (u.name LIKE ? OR p.interests LIKE ? OR p.bio LIKE ?)
            ORDER BY avg_rating DESC`,
            [searchTerm, searchTerm, searchTerm]
        );
        
        res.json({
            status: 'success',
            mentors
        });
    } catch (error) {
        console.error('Search mentors error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to search mentors' 
        });
    }
};

const addAvailability = async (req, res) => {
    const { startTime, duration } = req.body;
    const mentorId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO Availability_Slots (mentor_id, start_time, duration, status) VALUES (?, ?, ?, ?)',
            [mentorId, startTime, duration, 'available']
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Availability slot added successfully',
            slotId: result.insertId
        });
    } catch (error) {
        console.error('Add availability error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to add availability slot' 
        });
    }
};

const getMentorAvailability = async (req, res) => {
    const mentorId = req.user.userId;
    
    try {
        const [slots] = await pool.query(
            `SELECT slot_id, start_time, duration, status 
            FROM Availability_Slots 
            WHERE mentor_id = ? AND start_time > NOW()
            ORDER BY start_time ASC`,
            [mentorId]
        );
        
        res.json({
            status: 'success',
            slots
        });
    } catch (error) {
        console.error('Get mentor availability error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch availability' 
        });
    }
};

const deleteAvailability = async (req, res) => {
    const { id } = req.params;
    const mentorId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'DELETE FROM Availability_Slots WHERE slot_id = ? AND mentor_id = ?',
            [id, mentorId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Availability slot not found' 
            });
        }
        
        res.json({
            status: 'success',
            message: 'Availability slot deleted successfully'
        });
    } catch (error) {
        console.error('Delete availability error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete availability slot' 
        });
    }
};

module.exports = {
    getAllMentors,
    getMentorById,
    searchMentors,
    addAvailability,
    getMentorAvailability,
    deleteAvailability
};