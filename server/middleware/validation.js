const { body, validationResult } = require('express-validator');

const validateRegistration = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['mentor', 'mentee']).withMessage('Role must be mentor or mentee')
];

const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Validation failed',
            errors: errors.array() 
        });
    }
    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    handleValidationErrors
};