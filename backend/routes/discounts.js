const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all discounts
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM discounts ORDER BY name');
        // Convert restricted bit to boolean
        rows.forEach(r => r.restricted = !!r.restricted);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create discount
router.post('/', async (req, res) => {
    try {
        const { name, type, value, restricted } = req.body;
        const [result] = await pool.query(
            'INSERT INTO discounts (name, type, value, restricted) VALUES (?, ?, ?, ?)',
            [name, type, value, restricted ? 1 : 0]
        );
        res.status(201).json({ id: result.insertId, name, type, value, restricted });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update discount
router.put('/:id', async (req, res) => {
    try {
        const { name, type, value, restricted } = req.body;
        await pool.query(
            'UPDATE discounts SET name = ?, type = ?, value = ?, restricted = ? WHERE id = ?',
            [name, type, value, restricted ? 1 : 0, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete discount
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM discounts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
