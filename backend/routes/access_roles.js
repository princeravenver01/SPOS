const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM access_roles ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const [result] = await pool.query(
            'INSERT INTO access_roles (name, permissions) VALUES (?, ?)',
            [name, JSON.stringify(permissions)]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Role name already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, permissions } = req.body;
        await pool.query(
            'UPDATE access_roles SET name=?, permissions=? WHERE id=?',
            [name, JSON.stringify(permissions), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Role name already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM access_roles WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        // Handle FK constraint fail if role is assigned to users
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete role assigned to employees.' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
