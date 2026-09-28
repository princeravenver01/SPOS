const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all tables for an area or branch
router.get('/', async (req, res) => {
    try {
        const areaId = req.query.area_id;
        const branchId = req.query.branch_id;
        
        let query = 'SELECT t.* FROM tables t';
        let params = [];
        
        if (branchId) {
            query += ' JOIN areas a ON t.area_id = a.id WHERE a.branch_id = ? ORDER BY t.id ASC';
            params.push(branchId);
        } else if (areaId) {
            query += ' WHERE t.area_id = ? ORDER BY t.id ASC';
            params.push(areaId);
        } else {
            return res.status(400).json({ error: 'area_id or branch_id is required' });
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new table
router.post('/', async (req, res) => {
    try {
        const { area_id, name, capacity, x_position, y_position, is_enabled } = req.body;
        
        if (!area_id || !name) {
            return res.status(400).json({ error: 'area_id and name are required' });
        }

        const enabledVal = is_enabled !== undefined ? is_enabled : true;

        const [result] = await pool.query(
            'INSERT INTO tables (area_id, name, capacity, is_enabled, x_position, y_position) VALUES (?, ?, ?, ?, ?, ?)',
            [area_id, name, capacity || 4, enabledVal, x_position || 0, y_position || 0]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            area_id, name, 
            capacity: capacity || 4, 
            is_enabled: enabledVal,
            x_position: x_position || 0, 
            y_position: y_position || 0 
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Table name already exists in this area' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT (update) a table (name, capacity, or positions)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, capacity, x_position, y_position, is_enabled, merged_with_table_id } = req.body;
        
        let updateFields = [];
        let params = [];

        if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
        if (capacity !== undefined) { updateFields.push('capacity = ?'); params.push(capacity); }
        if (x_position !== undefined) { updateFields.push('x_position = ?'); params.push(x_position); }
        if (y_position !== undefined) { updateFields.push('y_position = ?'); params.push(y_position); }
        if (is_enabled !== undefined) { updateFields.push('is_enabled = ?'); params.push(is_enabled); }
        if (merged_with_table_id !== undefined) { updateFields.push('merged_with_table_id = ?'); params.push(merged_with_table_id); }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        
        await pool.query(`UPDATE tables SET ${updateFields.join(', ')} WHERE id = ?`, params);
        
        res.json({ success: true, message: 'Table updated successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Table name already exists in this area' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE a table
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tables WHERE id = ?', [id]);
        res.json({ success: true, message: 'Table deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
