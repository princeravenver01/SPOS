const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const branchId = req.query.branch_id;
        let query = 'SELECT * FROM customers';
        const params = [];
        if (branchId) {
            query += ' WHERE branch_id = ? OR branch_id IS NULL'; // Keep IS NULL for legacy/admin customers
            params.push(branchId);
        }
        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("GET /customers ERROR:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address, province, city, barangay, zip_code, customer_code, description, branch_id } = req.body;
        const [result] = await pool.query(
            'INSERT INTO customers (name, email, phone, address, province, city, barangay, zip_code, customer_code, description, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone, address, province, city, barangay, zip_code, customer_code, description, branch_id || null]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Customer code already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, email, phone, address, province, city, barangay, zip_code, customer_code, description, branch_id } = req.body;
        await pool.query(
            'UPDATE customers SET name=?, email=?, phone=?, address=?, province=?, city=?, barangay=?, zip_code=?, customer_code=?, description=?, branch_id=? WHERE id=?',
            [name, email, phone, address, province, city, barangay, zip_code, customer_code, description, branch_id || null, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Customer code already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
