const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all suppliers
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM suppliers ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Create supplier
router.post('/', async (req, res) => {
    const { 
        name, email, phone, website, 
        address_1, address_2, province, city, barangay, zip_code, note 
    } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    try {
        const [result] = await db.query(
            `INSERT INTO suppliers 
            (name, email, phone, website, address_1, address_2, province, city, barangay, zip_code, note) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email || null, phone || null, website || null, address_1 || null, address_2 || null, province || null, city || null, barangay || null, zip_code || null, note || null]
        );
        res.status(201).json({ id: result.insertId, message: 'Supplier created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create supplier' });
    }
});

// Update supplier
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        name, email, phone, website, 
        address_1, address_2, province, city, barangay, zip_code, note 
    } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    try {
        const [result] = await db.query(
            `UPDATE suppliers SET 
            name = ?, email = ?, phone = ?, website = ?, 
            address_1 = ?, address_2 = ?, province = ?, city = ?, barangay = ?, zip_code = ?, note = ? 
            WHERE id = ?`,
            [name, email || null, phone || null, website || null, address_1 || null, address_2 || null, province || null, city || null, barangay || null, zip_code || null, note || null, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ message: 'Supplier updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM suppliers WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ message: 'Supplier deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

module.exports = router;
