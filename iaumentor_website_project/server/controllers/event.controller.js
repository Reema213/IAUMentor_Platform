const { pool } = require('../config/db');

const createEvent = async (req, res) => {
    const { title, description, dateTime, location } = req.body;
    const organizerId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO Events (organizer_id, title, description, date_time, location, status) VALUES (?, ?, ?, ?, ?, ?)',
            [organizerId, title, description, dateTime, location, 'active']
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Event created successfully',
            eventId: result.insertId
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to create event' 
        });
    }
};

const getAllEvents = async (req, res) => {
    try {
        const [events] = await pool.query(
            `SELECT e.event_id, e.title, e.description, e.date_time, e.location, e.status,
            u.name as organizer_name,
            (SELECT COUNT(*) FROM Event_Registrations WHERE event_id = e.event_id AND reg_status = 'registered') as participants_count
            FROM Events e
            JOIN Users u ON e.organizer_id = u.user_id
            WHERE e.status = 'active' AND e.date_time >= NOW()
            ORDER BY e.date_time ASC`
        );
        
        res.json({
            status: 'success',
            events
        });
    } catch (error) {
        console.error('Get all events error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch events' 
        });
    }
};

const getEventById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [events] = await pool.query(
            `SELECT e.event_id, e.title, e.description, e.date_time, e.location, e.status, e.organizer_id,
            u.name as organizer_name, u.email as organizer_email
            FROM Events e
            JOIN Users u ON e.organizer_id = u.user_id
            WHERE e.event_id = ?`,
            [id]
        );
        
        if (events.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Event not found' 
            });
        }
        
        const [participants] = await pool.query(
            `SELECT u.user_id, u.name, u.email, er.created_at
            FROM Event_Registrations er
            JOIN Users u ON er.user_id = u.user_id
            WHERE er.event_id = ? AND er.reg_status = 'registered'
            ORDER BY er.created_at ASC`,
            [id]
        );
        
        res.json({
            status: 'success',
            event: events[0],
            participants
        });
    } catch (error) {
        console.error('Get event by ID error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch event details' 
        });
    }
};

const registerForEvent = async (req, res) => {
    const { eventId } = req.body;
    const userId = req.user.userId;
    
    try {
        const [events] = await pool.query(
            'SELECT * FROM Events WHERE event_id = ? AND status = "active"',
            [eventId]
        );

        if (events[0].organizer_id === userId) {
            return res.status(400).json({
                status: 'error',
                message: "Organizers cannot register for their own event"
            });
        }
        
        if (events.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Event not found or inactive' 
            });
        }
        
        const [existing] = await pool.query(
            'SELECT * FROM Event_Registrations WHERE event_id = ? AND user_id = ? AND reg_status = "registered"',
            [eventId, userId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Already registered for this event' 
            });
        }
        
        await pool.query(
            'INSERT INTO Event_Registrations (event_id, user_id, reg_status) VALUES (?, ?, ?)',
            [eventId, userId, 'registered']
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Successfully registered for event'
        });
    } catch (error) {
        console.error('Register for event error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to register for event' 
        });
    }
};

const unregisterFromEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'UPDATE Event_Registrations SET reg_status = "cancelled" WHERE event_id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Registration not found' 
            });
        }
        
        res.json({
            status: 'success',
            message: 'Successfully unregistered from event'
        });
    } catch (error) {
        console.error('Unregister from event error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to unregister from event' 
        });
    }
};

const getMyEvents = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const [registrations] = await pool.query(
            `SELECT e.event_id, e.title, e.description, e.date_time, e.location, e.status,
            u.name as organizer_name, er.reg_status, er.created_at as registered_at
            FROM Event_Registrations er
            JOIN Events e ON er.event_id = e.event_id
            JOIN Users u ON e.organizer_id = u.user_id
            WHERE er.user_id = ? AND er.reg_status = 'registered'
            ORDER BY e.date_time ASC`,
            [userId]
        );
        
        res.json({
            status: 'success',
            events: registrations
        });
    } catch (error) {
        console.error('Get my events error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch registered events' 
        });
    }
};

const getMyOrganizedEvents = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const [events] = await pool.query(
            `SELECT e.event_id, e.title, e.description, e.date_time, e.location, e.status,
            (SELECT COUNT(*) FROM Event_Registrations WHERE event_id = e.event_id AND reg_status = 'registered') as participants_count
            FROM Events e
            WHERE e.organizer_id = ?
            ORDER BY e.date_time DESC`,
            [userId]
        );
        
        res.json({
            status: 'success',
            events
        });
    } catch (error) {
        console.error('Get organized events error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch organized events' 
        });
    }
};

const updateEvent = async (req, res) => {
    const { id } = req.params;
    const { title, description, dateTime, location } = req.body;
    const userId = req.user.userId;
    
    try {
        const [events] = await pool.query(
            'SELECT * FROM Events WHERE event_id = ? AND organizer_id = ?',
            [id, userId]
        );
        
        if (events.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Event not found or unauthorized' 
            });
        }
        
        await pool.query(
            'UPDATE Events SET title = ?, description = ?, date_time = ?, location = ? WHERE event_id = ?',
            [title, description, dateTime, location, id]
        );
        
        res.json({
            status: 'success',
            message: 'Event updated successfully'
        });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update event' 
        });
    }
};

const cancelEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [events] = await pool.query(
            'SELECT * FROM Events WHERE event_id = ? AND organizer_id = ?',
            [id, userId]
        );
        
        if (events.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Event not found or unauthorized' 
            });
        }
        
        await pool.query(
            'UPDATE Events SET status = "cancelled" WHERE event_id = ?',
            [id]
        );
        
        res.json({
            status: 'success',
            message: 'Event cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel event error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to cancel event' 
        });
    }
};

module.exports = {
    createEvent,
    getAllEvents,
    getEventById,
    registerForEvent,
    unregisterFromEvent,
    getMyEvents,
    getMyOrganizedEvents,
    updateEvent,
    cancelEvent
};