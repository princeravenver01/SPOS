const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');

// Configure multer for local image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET all areas for a specific branch
router.get('/', async (req, res) => {
    try {
        const branchId = req.query.branch_id;
        let query = 'SELECT * FROM areas';
        let params = [];
        if (branchId) {
            query += ' WHERE branch_id = ?';
            params.push(branchId);
        }
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new area (with optional map image)
router.post('/', upload.single('map_image'), async (req, res) => {
    try {
        const { branch_id, name, type } = req.body;
        const map_image_url = req.file ? `/uploads/${req.file.filename}` : null;
        
        const [result] = await pool.query(
            'INSERT INTO areas (branch_id, name, type, map_image_url) VALUES (?, ?, ?, ?)',
            [branch_id, name, type || 'Indoor', map_image_url]
        );
        
        res.json({ id: result.insertId, branch_id, name, type: type || 'Indoor', map_image_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE an area
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM areas WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
