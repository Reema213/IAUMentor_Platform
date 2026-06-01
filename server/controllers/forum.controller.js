const { pool } = require('../config/db');

const getCategories = async (req, res) => {
    try {
        const [categories] = await pool.query(
            `SELECT fc.category_id, fc.name, fc.description, fc.icon,
            (SELECT COUNT(*) FROM Forum_Threads WHERE category_id = fc.category_id) as thread_count,
            (SELECT COUNT(*) FROM Forum_Replies fr 
             JOIN Forum_Threads ft ON fr.thread_id = ft.thread_id 
             WHERE ft.category_id = fc.category_id) as reply_count
            FROM Forum_Categories fc
            ORDER BY fc.category_id ASC`
        );
        
        res.json({
            status: 'success',
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch categories' 
        });
    }
};

const getThreadsByCategory = async (req, res) => {
    const { categoryId } = req.params;
    
    try {
        const [threads] = await pool.query(
            `SELECT ft.thread_id, ft.title, ft.content, ft.is_pinned, ft.is_locked, ft.views, ft.created_at,
            u.name as author_name, u.role as author_role,
            (SELECT COUNT(*) FROM Forum_Replies WHERE thread_id = ft.thread_id) as reply_count,
            (SELECT COUNT(*) FROM Forum_Votes WHERE target_type = 'thread' AND target_id = ft.thread_id AND vote_type = 'upvote') as upvotes,
            (SELECT COUNT(*) FROM Forum_Votes WHERE target_type = 'thread' AND target_id = ft.thread_id AND vote_type = 'downvote') as downvotes
            FROM Forum_Threads ft
            JOIN Users u ON ft.user_id = u.user_id
            WHERE ft.category_id = ?
            ORDER BY ft.is_pinned DESC, ft.updated_at DESC`,
            [categoryId]
        );
        
        res.json({
            status: 'success',
            threads
        });
    } catch (error) {
        console.error('Get threads error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch threads' 
        });
    }
};

const createThread = async (req, res) => {
    const { categoryId, title, content } = req.body;
    const userId = req.user.userId;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO Forum_Threads (category_id, user_id, title, content) VALUES (?, ?, ?, ?)',
            [categoryId, userId, title, content]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Thread created successfully',
            threadId: result.insertId
        });
    } catch (error) {
        console.error('Create thread error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to create thread' 
        });
    }
};

const getThreadById = async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(
            'UPDATE Forum_Threads SET views = views + 1 WHERE thread_id = ?',
            [id]
        );
        
        const [threads] = await pool.query(
            `SELECT ft.thread_id, ft.category_id, ft.title, ft.content, ft.is_pinned, ft.is_locked, ft.views, ft.created_at, ft.user_id,
            u.name as author_name, u.role as author_role,
            (SELECT COUNT(*) FROM Forum_Votes WHERE target_type = 'thread' AND target_id = ft.thread_id AND vote_type = 'upvote') as upvotes,
            (SELECT COUNT(*) FROM Forum_Votes WHERE target_type = 'thread' AND target_id = ft.thread_id AND vote_type = 'downvote') as downvotes
            FROM Forum_Threads ft
            JOIN Users u ON ft.user_id = u.user_id
            WHERE ft.thread_id = ?`,
            [id]
        );
        
        if (threads.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Thread not found' 
            });
        }
        
        const [replies] = await pool.query(
            `SELECT fr.reply_id, fr.content, fr.is_solution, fr.created_at, fr.user_id,
            u.name as author_name, u.role as author_role,
            (SELECT COUNT(*) FROM Forum_Votes WHERE target_type = 'reply' AND target_id = fr.reply_id AND vote_type = 'upvote') as upvotes,
            (SELECT COUNT(*) FROM Forum_Votes WHERE target_type = 'reply' AND target_id = fr.reply_id AND vote_type = 'downvote') as downvotes
            FROM Forum_Replies fr
            JOIN Users u ON fr.user_id = u.user_id
            WHERE fr.thread_id = ?
            ORDER BY fr.is_solution DESC, fr.created_at ASC`,
            [id]
        );
        
        res.json({
            status: 'success',
            thread: threads[0],
            replies
        });
    } catch (error) {
        console.error('Get thread error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch thread' 
        });
    }
};

const createReply = async (req, res) => {
    const { threadId, content } = req.body;
    const userId = req.user.userId;
    
    try {
        const [threads] = await pool.query(
            'SELECT is_locked FROM Forum_Threads WHERE thread_id = ?',
            [threadId]
        );
        
        if (threads.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Thread not found' 
            });
        }
        
        if (threads[0].is_locked) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'This thread is locked' 
            });
        }
        
        const [result] = await pool.query(
            'INSERT INTO Forum_Replies (thread_id, user_id, content) VALUES (?, ?, ?)',
            [threadId, userId, content]
        );
        
        await pool.query(
            'UPDATE Forum_Threads SET updated_at = NOW() WHERE thread_id = ?',
            [threadId]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Reply posted successfully',
            replyId: result.insertId
        });
    } catch (error) {
        console.error('Create reply error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to post reply' 
        });
    }
};

const voteContent = async (req, res) => {
    const { targetType, targetId, voteType } = req.body;
    const userId = req.user.userId;
    
    try {
        const [existing] = await pool.query(
            'SELECT * FROM Forum_Votes WHERE target_type = ? AND target_id = ? AND user_id = ?',
            [targetType, targetId, userId]
        );
        
        if (existing.length > 0) {
            if (existing[0].vote_type === voteType) {
                await pool.query(
                    'DELETE FROM Forum_Votes WHERE vote_id = ?',
                    [existing[0].vote_id]
                );
                return res.json({
                    status: 'success',
                    message: 'Vote removed'
                });
            } else {
                await pool.query(
                    'UPDATE Forum_Votes SET vote_type = ? WHERE vote_id = ?',
                    [voteType, existing[0].vote_id]
                );
                return res.json({
                    status: 'success',
                    message: 'Vote updated'
                });
            }
        }
        
        await pool.query(
            'INSERT INTO Forum_Votes (target_type, target_id, user_id, vote_type) VALUES (?, ?, ?, ?)',
            [targetType, targetId, userId, voteType]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Vote registered'
        });
    } catch (error) {
        console.error('Vote content error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to register vote' 
        });
    }
};

const markAsSolution = async (req, res) => {
    const { replyId } = req.body;
    const userId = req.user.userId;
    
    try {
        const [replies] = await pool.query(
            `SELECT fr.reply_id, fr.thread_id, ft.user_id as thread_owner
            FROM Forum_Replies fr
            JOIN Forum_Threads ft ON fr.thread_id = ft.thread_id
            WHERE fr.reply_id = ?`,
            [replyId]
        );
        
        if (replies.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Reply not found' 
            });
        }
        
        if (replies[0].thread_owner !== userId) {
            return res.status(403).json({ 
                status: 'error', 
                message: 'Only thread owner can mark solution' 
            });
        }
        
        await pool.query(
            'UPDATE Forum_Replies SET is_solution = FALSE WHERE thread_id = ?',
            [replies[0].thread_id]
        );
        
        await pool.query(
            'UPDATE Forum_Replies SET is_solution = TRUE WHERE reply_id = ?',
            [replyId]
        );
        
        res.json({
            status: 'success',
            message: 'Reply marked as solution'
        });
    } catch (error) {
        console.error('Mark as solution error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to mark as solution' 
        });
    }
};

const deleteThread = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    try {
        const [threads] = await pool.query(
            'SELECT user_id FROM Forum_Threads WHERE thread_id = ?',
            [id]
        );
        
        if (threads.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Thread not found' 
            });
        }
        
        if (threads[0].user_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ 
                status: 'error', 
                message: 'Unauthorized' 
            });
        }
        
        await pool.query('DELETE FROM Forum_Threads WHERE thread_id = ?', [id]);
        
        res.json({
            status: 'success',
            message: 'Thread deleted successfully'
        });
    } catch (error) {
        console.error('Delete thread error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete thread' 
        });
    }
};

const searchThreads = async (req, res) => {
    const { query } = req.query;
    
    try {
        const searchTerm = `%${query}%`;
        const [threads] = await pool.query(
            `SELECT ft.thread_id, ft.category_id, ft.title, ft.content, ft.views, ft.created_at,
            u.name as author_name,
            fc.name as category_name,
            (SELECT COUNT(*) FROM Forum_Replies WHERE thread_id = ft.thread_id) as reply_count
            FROM Forum_Threads ft
            JOIN Users u ON ft.user_id = u.user_id
            JOIN Forum_Categories fc ON ft.category_id = fc.category_id
            WHERE ft.title LIKE ? OR ft.content LIKE ?
            ORDER BY ft.updated_at DESC
            LIMIT 50`,
            [searchTerm, searchTerm]
        );
        
        res.json({
            status: 'success',
            threads
        });
    } catch (error) {
        console.error('Search threads error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to search threads' 
        });
    }
};

module.exports = {
    getCategories,
    getThreadsByCategory,
    createThread,
    getThreadById,
    createReply,
    voteContent,
    markAsSolution,
    deleteThread,
    searchThreads
};