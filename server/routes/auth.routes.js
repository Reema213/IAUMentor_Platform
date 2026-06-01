const express = require('express');
const router = express.Router();
const { register, login, logout, getProfile } = require('../controllers/auth.controller');
const { validateRegistration, validateLogin, handleValidationErrors } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');

router.post('/register', validateRegistration, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/logout', logout);
router.get('/profile', verifyToken, getProfile);

module.exports = router;