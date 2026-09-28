const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// GET receipt settings for a specific branch
router.get('/', async (req, res) => {
    try {
        const branchId = req.query.branch_id;
        if (!branchId) {
            return res.status(400).json({ error: 'branch_id is required' });
        }

        const [rows] = await pool.query('SELECT * FROM receipt_settings WHERE branch_id = ?', [branchId]);
        
        if (rows.length === 0) {
            return res.json(null);
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST / PUT receipt settings
router.post('/', upload.single('logo'), async (req, res) => {
    try {
        const { branch_id, header_text, footer_text, show_customer_info } = req.body;
        
        if (!branch_id) {
            return res.status(400).json({ error: 'branch_id is required' });
        }

        // Check if settings already exist
        const [existing] = await pool.query('SELECT * FROM receipt_settings WHERE branch_id = ?', [branch_id]);
        
        let logo_url = existing.length > 0 ? existing[0].logo_url : null;
        if (req.file) {
            logo_url = `/uploads/${req.file.filename}`;
        }
        // User explicitly removes logo
        if (req.body.remove_logo === 'true') {
            logo_url = null;
        }

        const showInfo = show_customer_info === 'true' || show_customer_info === true;

        if (existing.length > 0) {
            // Update
            await pool.query(
                `UPDATE receipt_settings SET 
                 logo_url = ?, header_text = ?, footer_text = ?, show_customer_info = ?
                 WHERE branch_id = ?`,
                [logo_url, header_text, footer_text, showInfo, branch_id]
            );
        } else {
            // Insert
            await pool.query(
                `INSERT INTO receipt_settings (branch_id, logo_url, header_text, footer_text, show_customer_info) 
                 VALUES (?, ?, ?, ?, ?)`,
                [branch_id, logo_url, header_text, footer_text, showInfo]
            );
        }
        
        res.json({ success: true, logo_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
