const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items WHERE is_active = 1');
    res.json({ success: true, items: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
