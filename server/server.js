const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const mentorRoutes = require('./routes/mentor.routes');
const sessionRoutes = require('./routes/session.routes');
const eventRoutes = require('./routes/event.routes');
const resourceRoutes = require('./routes/resource.routes');
const messageRoutes = require('./routes/message.routes');
const adminRoutes = require('./routes/admin.routes');
const progressRoutes = require('./routes/progress.routes.js');
const forumRoutes = require('./routes/forum.routes');


app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/forums', forumRoutes);

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'IAUMentor API is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test-db', async (req, res) => {
    const isConnected = await testConnection();
    if (isConnected) {
        res.json({ 
            status: 'success', 
            message: 'Database connection successful' 
        });
    } else {
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed' 
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((req, res) => {
    res.status(404).json({ 
        status: 'error', 
        message: 'Route not found' 
    });
});

const startServer = async () => {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('Failed to connect to database. Please check your connection details.');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`\n IAUMentor Server is running`);
        console.log(` Local: http://localhost:${PORT}`);
        console.log(` Health Check: http://localhost:${PORT}/api/health`);
        console.log(`  Database Test: http://localhost:${PORT}/api/test-db\n`);
    });
};

startServer();