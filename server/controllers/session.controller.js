const { pool } = require('../config/db');

const bookSession = async (req, res) => {
    const { mentorId, slotId } = req.body;
    const menteeId = req.user.userId;
    
    try {
        const [slots] = await pool.query(
            'SELECT * FROM Availability_Slots WHERE slot_id = ? AND mentor_id = ? AND status = "available"',
            [slotId, mentorId]
        );
        
        if (slots.length === 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Time slot is not available' 
            });
        }
        
        await pool.query(
            'UPDATE Availability_Slots SET status = "booked" WHERE slot_id = ?',
            [slotId]
        );
        
        const [result] = await pool.query(
            'INSERT INTO Session_Bookings (mentee_id, mentor_id, slot_id, status) VALUES (?, ?, ?, ?)',
            [menteeId, mentorId, slotId, 'pending']
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Session booking request sent successfully',
            bookingId: result.insertId
        });
    } catch (error) {
        console.error('Book session error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to book session' 
        });
    }
};

const getMySessions = async (req, res) => {
    const userId = req.user.userId;
    const role = req.user.role;
    
    try {
        let sessions;
        
        if (role === 'mentee') {
            [sessions] = await pool.query(
                `SELECT sb.booking_id, sb.status, sb.created_at,
                u.name as mentor_name, u.email as mentor_email,
                a.start_time, a.duration
                FROM Session_Bookings sb
                JOIN Users u ON sb.mentor_id = u.user_id
                JOIN Availability_Slots a ON sb.slot_id = a.slot_id
                WHERE sb.mentee_id = ?
                ORDER BY a.start_time DESC`,
                [userId]
            );
        } else if (role === 'mentor') {
            [sessions] = await pool.query(
                `SELECT sb.booking_id, sb.status, sb.created_at,
                u.name as mentee_name, u.email as mentee_email,
                a.start_time, a.duration
                FROM Session_Bookings sb
                JOIN Users u ON sb.mentee_id = u.user_id
                JOIN Availability_Slots a ON sb.slot_id = a.slot_id
                WHERE sb.mentor_id = ?
                ORDER BY a.start_time DESC`,
                [userId]
            );
        }
        
        res.json({
            status: 'success',
            sessions
        });
    } catch (error) {
        console.error('Get my sessions error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch sessions' 
        });
    }
};

const updateSessionStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    
    try {
        const [bookings] = await pool.query(
            'SELECT * FROM Session_Bookings WHERE booking_id = ? AND mentor_id = ?',
            [id, userId]
        );
        
        if (bookings.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Booking not found or unauthorized' 
            });
        }
        
        await pool.query(
            'UPDATE Session_Bookings SET status = ? WHERE booking_id = ?',
            [status, id]
        );
        
        if (status === 'rejected') {
            await pool.query(
                'UPDATE Availability_Slots SET status = "available" WHERE slot_id = ?',
                [bookings[0].slot_id]
            );
        }
        
        res.json({
            status: 'success',
            message: `Session ${status} successfully`
        });
    } catch (error) {
        console.error('Update session status error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update session status' 
        });
    }
};

const cancelSession = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [bookings] = await pool.query(
            'SELECT * FROM Session_Bookings WHERE booking_id = ? AND mentee_id = ?',
            [id, userId]
        );
        
        if (bookings.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Booking not found or unauthorized' 
            });
        }
        
        await pool.query(
            'DELETE FROM Session_Bookings WHERE booking_id = ?',
            [id]
        );
        
        await pool.query(
            'UPDATE Availability_Slots SET status = "available" WHERE slot_id = ?',
            [bookings[0].slot_id]
        );
        
        res.json({
            status: 'success',
            message: 'Session cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel session error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to cancel session' 
        });
    }
};

const submitFeedback = async (req, res) => {
    const { bookingId, rating, comments } = req.body;
    const userId = req.user.userId;
    
    try {
        const [bookings] = await pool.query(
            'SELECT * FROM Session_Bookings WHERE booking_id = ? AND mentee_id = ? AND status = "approved"',
            [bookingId, userId]
        );
        
        if (bookings.length === 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Invalid booking or session not completed' 
            });
        }
        
        const [existing] = await pool.query(
            'SELECT * FROM Mentor_Feedback WHERE booking_id = ?',
            [bookingId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Feedback already submitted for this session' 
            });
        }
        
        await pool.query(
            'INSERT INTO Mentor_Feedback (booking_id, rating, comments) VALUES (?, ?, ?)',
            [bookingId, rating, comments]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Feedback submitted successfully'
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to submit feedback' 
        });
    }
};

const getPendingBookings = async (req, res) => {
    const mentorId = req.user.userId;
    
    try {
        const [bookings] = await pool.query(
            `SELECT sb.booking_id, sb.status, sb.created_at,
            u.name as mentee_name, u.email as mentee_email,
            a.start_time, a.duration
            FROM Session_Bookings sb
            JOIN Users u ON sb.mentee_id = u.user_id
            JOIN Availability_Slots a ON sb.slot_id = a.slot_id
            WHERE sb.mentor_id = ? AND sb.status = 'pending'
            ORDER BY a.start_time ASC`,
            [mentorId]
        );
        
        res.json({
            status: 'success',
            bookings
        });
    } catch (error) {
        console.error('Get pending bookings error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch pending bookings' 
        });
    }
};

module.exports = {
    bookSession,
    getMySessions,
    updateSessionStatus,
    cancelSession,
    submitFeedback,
    getPendingBookings
};