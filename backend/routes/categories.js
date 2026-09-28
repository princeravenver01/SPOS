const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const { branch_id } = req.query;
        let query = 'SELECT * FROM categories';
        const params = [];
        if (branch_id) {
            query += ' WHERE branch_id = ?';
            params.push(branch_id);
        }
        query += ' ORDER BY name';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create category
router.post('/', async (req, res) => {
    try {
        const { name, color, branch_id } = req.body;
        if (!branch_id) {
            return res.status(400).json({ error: 'branch_id is required' });
        }
        const [result] = await pool.query('INSERT INTO categories (name, color, branch_id) VALUES (?, ?, ?)', [name, color || '#fbbd05', branch_id]);
        res.status(201).json({ id: result.insertId, name, color, branch_id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Category name already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        const { name, color } = req.body;
        await pool.query('UPDATE categories SET name = ?, color = ? WHERE id = ?', [name, color, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
