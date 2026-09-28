const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all pos devices
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT p.*, b.name AS branch_name 
            FROM pos_devices p 
            JOIN branches b ON p.branch_id = b.id
            ORDER BY p.created_at DESC
        `;
        const [devices] = await pool.query(query);
        res.json(devices);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new pos device
router.post('/', async (req, res) => {
    try {
        const { name, branch_id } = req.body;
        
        if (!name || !branch_id) {
            return res.status(400).json({ error: 'Name and Branch are required' });
        }

        const validBranchId = parseInt(branch_id);

        const [result] = await pool.query(
            'INSERT INTO pos_devices (name, branch_id) VALUES (?, ?)',
            [name, validBranchId]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            name, 
            branch_id: validBranchId 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE a pos device
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM pos_devices WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'POS device deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
