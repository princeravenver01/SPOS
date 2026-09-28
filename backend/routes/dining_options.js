const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all active dining options
router.get('/', async (req, res) => {
    try {
        const [options] = await pool.query('SELECT * FROM dining_options ORDER BY name ASC');
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new dining option
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO dining_options (name) VALUES (?)',
            [name]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            name, 
            is_active: 1
        });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Dining option already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE a dining option
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM dining_options WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Dining option deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
