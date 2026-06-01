const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const register = async (req, res) => {
    const { name, email, password, role } = req.body;
    
    try {
        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Email already registered' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );
        
        await pool.query(
            'INSERT INTO Profiles (user_id, bio, interests, contact) VALUES (?, ?, ?, ?)',
            [result.insertId, '', '', email]
        );
        
        const token = jwt.sign(
            { userId: result.insertId, email, role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            token,
            user: {
                id: result.insertId,
                name,
                email,
                role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Registration failed' 
        });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Invalid email or password' 
            });
        }
        
        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Invalid email or password' 
            });
        }
        
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production'
        });
        
        res.json({
            status: 'success',
            message: 'Login successful',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Login failed' 
        });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({
        status: 'success',
        message: 'Logout successful'
    });
};

const getProfile = async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT u.user_id, u.name, u.email, u.role, p.bio, p.interests, p.contact FROM Users u LEFT JOIN Profiles p ON u.user_id = p.user_id WHERE u.user_id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'User not found' 
            });
        }
        
        res.json({
            status: 'success',
            user: users[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch profile' 
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile
};