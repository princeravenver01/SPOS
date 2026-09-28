const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all branches
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM branches ORDER BY created_at ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new branch
router.post('/', async (req, res) => {
    try {
        const { name, address, provCode, cityCode, brgyCode, provinceName, cityName, brgyName, postalCode, phone, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const [result] = await pool.query(
            `INSERT INTO branches (name, address, provCode, cityCode, brgyCode, provinceName, cityName, brgyName, postalCode, phone, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, address, provCode, cityCode, brgyCode, provinceName, cityName, brgyName, postalCode, phone, description]
        );
        
        res.status(201).json({ id: result.insertId, message: 'Branch created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT (update) an existing branch
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, provCode, cityCode, brgyCode, provinceName, cityName, brgyName, postalCode, phone, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        await pool.query(
            `UPDATE branches SET 
             name = ?, address = ?, provCode = ?, cityCode = ?, brgyCode = ?, provinceName = ?, cityName = ?, brgyName = ?, postalCode = ?, phone = ?, description = ?
             WHERE id = ?`,
            [name, address, provCode, cityCode, brgyCode, provinceName, cityName, brgyName, postalCode, phone, description, id]
        );
        
        res.json({ success: true, message: 'Branch updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE a branch
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM branches WHERE id = ?', [id]);
        res.json({ success: true, message: 'Branch deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
