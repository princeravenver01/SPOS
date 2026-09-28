const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all modifiers with options (filtered by branch)
router.get('/', async (req, res) => {
    const { branch_id } = req.query;
    try {
        let query = 'SELECT * FROM modifiers';
        const params = [];
        if (branch_id) {
            query += ' WHERE branch_id = ?';
            params.push(branch_id);
        }
        query += ' ORDER BY name';
        
        const [mods] = await pool.query(query, params);
        
        if (mods.length === 0) {
            return res.json([]);
        }

        const modifierIds = mods.map(m => m.id);
        const [opts] = await pool.query('SELECT * FROM modifier_options WHERE modifier_id IN (?)', [modifierIds]);
        
        const modifiers = mods.map(m => ({
            ...m,
            is_required: !!m.is_required,
            options: opts.filter(o => o.modifier_id === m.id)
        }));
        
        res.json(modifiers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create modifier and options
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { branch_id, name, is_required, max_selections, options } = req.body;
        
        if (!branch_id) {
            return res.status(400).json({ error: 'branch_id is required' });
        }

        const [modResult] = await connection.query(
            'INSERT INTO modifiers (branch_id, name, is_required, max_selections) VALUES (?, ?, ?, ?)', 
            [branch_id, name, is_required ? 1 : 0, max_selections || 1]
        );
        const modifierId = modResult.insertId;

        if (options && options.length > 0) {
            const values = options.map(opt => [modifierId, opt.name, opt.price || 0]);
            await connection.query('INSERT INTO modifier_options (modifier_id, name, price) VALUES ?', [values]);
        }

        await connection.commit();
        res.status(201).json({ id: modifierId, name, options });
    } catch (err) {
        console.error(err);
        await connection.rollback();
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// Update modifier and options
router.put('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { branch_id, name, is_required, max_selections, options } = req.body;

        await connection.query(
            'UPDATE modifiers SET name = ?, is_required = ?, max_selections = ? WHERE id = ?', 
            [name, is_required ? 1 : 0, max_selections || 1, id]
        );
        
        // Simple strategy: delete existing options and recreate
        await connection.query('DELETE FROM modifier_options WHERE modifier_id = ?', [id]);
        
        if (options && options.length > 0) {
            const values = options.map(opt => [id, opt.name, opt.price || 0]);
            await connection.query('INSERT INTO modifier_options (modifier_id, name, price) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        await connection.rollback();
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// Delete modifier
router.delete('/:id', async (req, res) => {
    try {
        // DELETE CASCADE will handle modifier_options and product_modifiers
        await pool.query('DELETE FROM modifiers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
