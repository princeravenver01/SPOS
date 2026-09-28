const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all settings
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update or insert a setting
router.post('/', async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'Setting key is required' });

        await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [key, JSON.stringify(value), JSON.stringify(value)]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
