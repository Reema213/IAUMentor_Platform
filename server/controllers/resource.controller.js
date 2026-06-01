const { pool } = require('../config/db');
const path = require('path');
const fs = require('fs');

const uploadResource = async (req, res) => {
    const { title, description, tags } = req.body;
    const ownerId = req.user.userId;
    
    if (!req.file) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'No file uploaded' 
        });
    }
    
    const fileUrl = `/uploads/resources/${req.file.filename}`;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO Resources (owner_id, title, description, file_url, tags) VALUES (?, ?, ?, ?, ?)',
            [ownerId, title, description, fileUrl, tags]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Resource uploaded successfully',
            resourceId: result.insertId,
            fileUrl
        });
    } catch (error) {
        console.error('Upload resource error:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to upload resource' 
        });
    }
};

const getAllResources = async (req, res) => {
    try {
        const [resources] = await pool.query(
            `SELECT r.resource_id, r.title, r.description, r.file_url, r.tags, r.created_at,
            u.name as owner_name,
            (SELECT AVG(stars) FROM Resource_Ratings WHERE resource_id = r.resource_id) as avg_rating,
            (SELECT COUNT(*) FROM Resource_Ratings WHERE resource_id = r.resource_id) as rating_count
            FROM Resources r
            JOIN Users u ON r.owner_id = u.user_id
            ORDER BY r.created_at DESC`
        );
        
        res.json({
            status: 'success',
            resources
        });
    } catch (error) {
        console.error('Get all resources error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch resources' 
        });
    }
};

const getResourceById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [resources] = await pool.query(
            `SELECT r.resource_id, r.title, r.description, r.file_url, r.tags, r.created_at, r.owner_id,
            u.name as owner_name, u.email as owner_email,
            (SELECT AVG(stars) FROM Resource_Ratings WHERE resource_id = r.resource_id) as avg_rating,
            (SELECT COUNT(*) FROM Resource_Ratings WHERE resource_id = r.resource_id) as rating_count
            FROM Resources r
            JOIN Users u ON r.owner_id = u.user_id
            WHERE r.resource_id = ?`,
            [id]
        );
        
        if (resources.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Resource not found' 
            });
        }
        
        const [ratings] = await pool.query(
            `SELECT rr.stars, rr.comment, rr.created_at, u.name as user_name
            FROM Resource_Ratings rr
            JOIN Users u ON rr.user_id = u.user_id
            WHERE rr.resource_id = ?
            ORDER BY rr.created_at DESC`,
            [id]
        );
        
        res.json({
            status: 'success',
            resource: resources[0],
            ratings
        });
    } catch (error) {
        console.error('Get resource by ID error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch resource details' 
        });
    }
};

const searchResources = async (req, res) => {
    const { query } = req.query;
    
    try {
        const searchTerm = `%${query}%`;
        const [resources] = await pool.query(
            `SELECT r.resource_id, r.title, r.description, r.file_url, r.tags, r.created_at,
            u.name as owner_name,
            (SELECT AVG(stars) FROM Resource_Ratings WHERE resource_id = r.resource_id) as avg_rating,
            (SELECT COUNT(*) FROM Resource_Ratings WHERE resource_id = r.resource_id) as rating_count
            FROM Resources r
            JOIN Users u ON r.owner_id = u.user_id
            WHERE r.title LIKE ? OR r.description LIKE ? OR r.tags LIKE ?
            ORDER BY r.created_at DESC`,
            [searchTerm, searchTerm, searchTerm]
        );
        
        res.json({
            status: 'success',
            resources
        });
    } catch (error) {
        console.error('Search resources error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to search resources' 
        });
    }
};

const getMyResources = async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const [resources] = await pool.query(
            `SELECT r.resource_id, r.title, r.description, r.file_url, r.tags, r.created_at,
            (SELECT AVG(stars) FROM Resource_Ratings WHERE resource_id = r.resource_id) as avg_rating,
            (SELECT COUNT(*) FROM Resource_Ratings WHERE resource_id = r.resource_id) as rating_count
            FROM Resources r
            WHERE r.owner_id = ?
            ORDER BY r.created_at DESC`,
            [userId]
        );
        
        res.json({
            status: 'success',
            resources
        });
    } catch (error) {
        console.error('Get my resources error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch your resources' 
        });
    }
};

const rateResource = async (req, res) => {
    const { resourceId, stars, comment } = req.body;
    const userId = req.user.userId;
    
    try {
        const [existing] = await pool.query(
            'SELECT * FROM Resource_Ratings WHERE resource_id = ? AND user_id = ?',
            [resourceId, userId]
        );
        
        if (existing.length > 0) {
            await pool.query(
                'UPDATE Resource_Ratings SET stars = ?, comment = ? WHERE resource_id = ? AND user_id = ?',
                [stars, comment, resourceId, userId]
            );
            res.json({
                status: 'success',
                message: 'Rating updated successfully'
            });
        } else {
            await pool.query(
                'INSERT INTO Resource_Ratings (resource_id, user_id, stars, comment) VALUES (?, ?, ?, ?)',
                [resourceId, userId, stars, comment]
            );
            res.status(201).json({
                status: 'success',
                message: 'Rating submitted successfully'
            });
        }
    } catch (error) {
        console.error('Rate resource error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to submit rating' 
        });
    }
};

const deleteResource = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const [resources] = await pool.query(
            'SELECT * FROM Resources WHERE resource_id = ? AND owner_id = ?',
            [id, userId]
        );
        
        if (resources.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Resource not found or unauthorized' 
            });
        }
        
        const filePath = path.join(__dirname, '../../', resources[0].file_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        await pool.query('DELETE FROM Resources WHERE resource_id = ?', [id]);
        
        res.json({
            status: 'success',
            message: 'Resource deleted successfully'
        });
    } catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete resource' 
        });
    }
};

const reportResource = async (req, res) => {
    const { resourceId, reason } = req.body;
    const reporterId = req.user.userId;
    
    try {
        await pool.query(
            'INSERT INTO Content_Reports (target_type, target_id, reporter_id, reason, status) VALUES (?, ?, ?, ?, ?)',
            ['resource', resourceId, reporterId, reason, 'pending']
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Report submitted successfully'
        });
    } catch (error) {
        console.error('Report resource error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to submit report' 
        });
    }
};

module.exports = {
    uploadResource,
    getAllResources,
    getResourceById,
    searchResources,
    getMyResources,
    rateResource,
    deleteResource,
    reportResource
};