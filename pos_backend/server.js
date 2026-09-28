const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors()); // In production, restrict this to local IPs or specific tunnel domains
app.use(express.json());

// Routes
const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

// Basic health check for POS terminal connectivity
app.get('/api/health', (req, res) => {
    res.json({ status: 'online', service: 'POS Terminal API' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`POS Terminal Backend running on port ${PORT}`);
});
