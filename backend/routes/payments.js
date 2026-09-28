const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all payment types (includes branch details if assigned)
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT p.*, b.name AS branch_name 
            FROM payment_types p 
            LEFT JOIN branches b ON p.branch_id = b.id
        `;
        const [payments] = await pool.query(query);
        
        const formattedPayments = payments.map(p => ({
            id: p.id,
            type: p.type,
            name: p.name,
            branch_id: p.branch_id,
            branch: p.branch_id ? p.branch_name : 'All Branches'
        }));
        
        res.json(formattedPayments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new payment type
router.post('/', async (req, res) => {
    try {
        const { type, name, branch_id } = req.body;
        
        if (!type || !name) {
            return res.status(400).json({ error: 'Type and name are required' });
        }

        const validBranchId = branch_id ? parseInt(branch_id) : null;

        const [result] = await pool.query(
            'INSERT INTO payment_types (type, name, branch_id) VALUES (?, ?, ?)',
            [type, name, validBranchId]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            type, 
            name, 
            branch_id: validBranchId 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE a payment type
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM payment_types WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Payment type deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
