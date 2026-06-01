const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            status: 'error', 
            message: 'Access denied. No token provided.' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            status: 'error', 
            message: 'Invalid or expired token' 
        });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            status: 'error', 
            message: 'Access denied. Admin only.' 
        });
    }
    next();
};

const isMentor = (req, res, next) => {
    if (req.user.role !== 'mentor' && req.user.role !== 'admin') {
        return res.status(403).json({ 
            status: 'error', 
            message: 'Access denied. Mentor only.' 
        });
    }
    next();
};

module.exports = {
    verifyToken,
    isAdmin,
    isMentor
};