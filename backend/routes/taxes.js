const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all taxes with their assigned branches and dining options
router.get('/', async (req, res) => {
    try {
        const [taxes] = await pool.query('SELECT * FROM taxes');
        
        const [branches] = await pool.query('SELECT * FROM tax_branches');
        const [diningOpts] = await pool.query('SELECT * FROM tax_dining_options');
        
        // Group by tax_id
        const formattedTaxes = taxes.map(tax => {
            const applicableBranches = branches
                .filter(b => b.tax_id === tax.id)
                .map(b => b.branch_id);
            
            const diningOptions = diningOpts
                .filter(d => d.tax_id === tax.id)
                .map(d => d.dining_option_name);
                
            return {
                ...tax,
                applicableBranches,
                diningOptions
            };
        });
        
        res.json(formattedTaxes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new tax (with relationships)
router.post('/', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { name, rate, rateType, calculationType, dependsOnDining, applicableBranches, diningOptions } = req.body;
        
        if (!name || !rate) {
            return res.status(400).json({ error: 'Name and rate are required' });
        }

        await conn.beginTransaction();

        // 1. Insert into taxes table
        const [result] = await conn.query(
            'INSERT INTO taxes (name, rate, rate_type, calculation_type, depends_on_dining) VALUES (?, ?, ?, ?, ?)',
            [name, rate, rateType || '%', calculationType || 'added', dependsOnDining ? 1 : 0]
        );
        const taxId = result.insertId;

        // 2. Insert into tax_branches
        if (applicableBranches && applicableBranches.length > 0) {
            // Filter out any invalid non-integer branch values that might have snuck in (like "All Branches")
            const validBranchIds = applicableBranches.map(b => parseInt(b)).filter(b => !isNaN(b));
            if (validBranchIds.length > 0) {
                const branchValues = validBranchIds.map(branchId => [taxId, branchId]);
                await conn.query('INSERT INTO tax_branches (tax_id, branch_id) VALUES ?', [branchValues]);
            }
        }

        // 3. Insert into tax_dining_options
        if (dependsOnDining && diningOptions && diningOptions.length > 0) {
            const validDiningIds = diningOptions.map(d => parseInt(d)).filter(d => !isNaN(d));
            if (validDiningIds.length > 0) {
                const diningValues = validDiningIds.map(diningOptId => [taxId, diningOptId]);
                await conn.query('INSERT INTO tax_dining_options (tax_id, dining_option_id) VALUES ?', [diningValues]);
            }
        }

        await conn.commit();
        
        res.status(201).json({ 
            id: taxId, 
            name, 
            rate, 
            rateType: rateType || '%', 
            calculationType: calculationType || 'added', 
            dependsOnDining: dependsOnDining ? 1 : 0,
            applicableBranches: applicableBranches || [],
            diningOptions: diningOptions || []
        });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
});

// DELETE a tax
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM taxes WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Tax deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
