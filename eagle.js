require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const { authRouter, connectDB } = require('./serverAuth');
const setupGameServer = require('./serverGame');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối DB trước khi chạy
(async () => {
    await connectDB();

    // Mount route
    app.use(authRouter);

    app.get('/menu', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'menu.html'));
    });

    // Game logic bằng socket.io
    setupGameServer(server);

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`🦅 Eagle server bay tại: http://localhost:${PORT}`);
    });
})();