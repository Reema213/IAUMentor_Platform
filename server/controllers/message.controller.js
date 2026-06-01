const { pool } = require('../config/db');

const sendMessage = async (req, res) => {
    const { recipientId, body } = req.body;
    const senderId = req.user.userId;
    
    try {
        const [users] = await pool.query(
            'SELECT * FROM Users WHERE user_id = ?',
            [recipientId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Recipient not found' 
            });
        }
        
        const [result] = await pool.query(
            'INSERT INTO Messages (sender_id, recipient_id, body) VALUES (?, ?, ?)',
            [senderId, recipientId, body]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Message sent successfully',
            messageId: result.insertId
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to send message' 
        });
    }
};

const getConversations = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const [conversations] = await pool.query(
            `SELECT DISTINCT 
                CASE 
                    WHEN m.sender_id = ? THEN m.recipient_id 
                    ELSE m.sender_id 
                END as user_id,
                u.name as user_name,
                u.email as user_email,
                (SELECT body FROM Messages 
                 WHERE (sender_id = ? AND recipient_id = user_id) 
                    OR (sender_id = user_id AND recipient_id = ?)
                 ORDER BY sent_at DESC LIMIT 1) as last_message,
                (SELECT sent_at FROM Messages 
                 WHERE (sender_id = ? AND recipient_id = user_id) 
                    OR (sender_id = user_id AND recipient_id = ?)
                 ORDER BY sent_at DESC LIMIT 1) as last_message_time,
                (SELECT COUNT(*) FROM Messages 
                 WHERE sender_id = user_id AND recipient_id = ? AND read_at IS NULL) as unread_count
            FROM Messages m
            JOIN Users u ON u.user_id = CASE 
                WHEN m.sender_id = ? THEN m.recipient_id 
                ELSE m.sender_id 
            END
            WHERE m.sender_id = ? OR m.recipient_id = ?
            ORDER BY last_message_time DESC`,
            [userId, userId, userId, userId, userId, userId, userId, userId, userId]
        );
        
        res.json({
            status: 'success',
            conversations
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch conversations' 
        });
    }
};

const getMessages = async (req, res) => {
    const { userId: otherUserId } = req.params;
    const userId = req.user.userId;
    
    try {
        const [messages] = await pool.query(
            `SELECT m.message_id, m.sender_id, m.recipient_id, m.body, m.sent_at, m.read_at,
            s.name as sender_name, r.name as recipient_name
            FROM Messages m
            JOIN Users s ON m.sender_id = s.user_id
            JOIN Users r ON m.recipient_id = r.user_id
            WHERE (m.sender_id = ? AND m.recipient_id = ?) 
               OR (m.sender_id = ? AND m.recipient_id = ?)
            ORDER BY m.sent_at ASC`,
            [userId, otherUserId, otherUserId, userId]
        );
        
        await pool.query(
            'UPDATE Messages SET read_at = NOW() WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL',
            [otherUserId, userId]
        );
        
        res.json({
            status: 'success',
            messages
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch messages' 
        });
    }
};

const markAsRead = async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    
    try {
        await pool.query(
            'UPDATE Messages SET read_at = NOW() WHERE message_id = ? AND recipient_id = ?',
            [messageId, userId]
        );
        
        res.json({
            status: 'success',
            message: 'Message marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to mark message as read' 
        });
    }
};

const deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'DELETE FROM Messages WHERE message_id = ? AND sender_id = ?',
            [messageId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Message not found or unauthorized' 
            });
        }
        
        res.json({
            status: 'success',
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete message' 
        });
    }
};

const searchUsers = async (req, res) => {
    const { query } = req.query;
    const userId = req.user.userId;
    
    try {
        const searchTerm = `%${query}%`;
        const [users] = await pool.query(
            `SELECT user_id, name, email, role 
            FROM Users 
            WHERE (name LIKE ? OR email LIKE ?) AND user_id != ?
            LIMIT 20`,
            [searchTerm, searchTerm, userId]
        );
        
        res.json({
            status: 'success',
            users
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to search users' 
        });
    }
};

const getUnreadCount = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'SELECT COUNT(*) as unread_count FROM Messages WHERE recipient_id = ? AND read_at IS NULL',
            [userId]
        );
        
        res.json({
            status: 'success',
            unreadCount: result[0].unread_count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch unread count' 
        });
    }
};

module.exports = {
    sendMessage,
    getConversations,
    getMessages,
    markAsRead,
    deleteMessage,
    searchUsers,
    getUnreadCount
};