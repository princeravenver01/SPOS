const express = require('express');
const router = express.Router();
const db = require('../db');

// POS PIN login
router.post('/login', async (req, res) => {
  const { username, pin } = req.body;
  
  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN are required' });
  }

  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, ar.name as role, u.name, 
             GROUP_CONCAT(ub.branch_id) as branch_ids
      FROM users u 
      LEFT JOIN access_roles ar ON u.role_id = ar.id 
      LEFT JOIN user_branches ub ON u.id = ub.user_id
      WHERE u.username = ? AND u.pin_hash = ?
      GROUP BY u.id
    `, [username, pin]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Username or PIN' });
    }

    const user = rows[0];
    
    let branches = [];
    if (user.branch_ids) {
        const bIds = user.branch_ids.split(',').map(Number);
        user.branch_ids = bIds;
        if (bIds.length > 0) {
            const [bRows] = await db.query('SELECT id, name FROM branches WHERE id IN (?)', [bIds]);
            branches = bRows;
        }
    } else {
        user.branch_ids = [];
    }
    
    user.branches = branches;
    
    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin login
router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, ar.name as role, u.name,
             GROUP_CONCAT(ub.branch_id) as branch_ids
      FROM users u 
      LEFT JOIN access_roles ar ON u.role_id = ar.id 
      LEFT JOIN user_branches ub ON u.id = ub.user_id
      WHERE u.username = ? 
        AND (u.password_hash = ? OR (u.password_hash IS NULL AND u.pin_hash = ?))
        AND (ar.name = "Administrator" OR ar.name = "Manager" OR u.role = "admin")
      GROUP BY u.id
    `, [username, password, password]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or unauthorized' });
    }

    const user = rows[0];
    
    let branches = [];
    if (user.branch_ids) {
        const bIds = user.branch_ids.split(',').map(Number);
        user.branch_ids = bIds;
        if (bIds.length > 0) {
            const [bRows] = await db.query('SELECT id, name FROM branches WHERE id IN (?)', [bIds]);
            branches = bRows;
        }
    } else {
        user.branch_ids = [];
    }
    
    user.branches = branches;

    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Fetch all users with POS access for dropdown
router.get('/pos-users', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    const [rows] = await db.query(`
      SELECT u.username, u.name, ar.name as role_name, ar.permissions, GROUP_CONCAT(ub.branch_id) as branch_ids
      FROM users u 
      JOIN access_roles ar ON u.role_id = ar.id 
      LEFT JOIN user_branches ub ON u.id = ub.user_id
      WHERE u.username IS NOT NULL AND u.username != ''
      GROUP BY u.id
      ORDER BY ar.name ASC, u.name ASC
    `);

    // Filter users whose role has pos_access = true
    const posUsers = rows.filter(row => {
      let perms = row.permissions;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (e) { return false; }
      }
      const hasPosAccess = perms && (perms.pos_access === true || perms.pos_access === 'true' || perms.pos_access === 1);
      if (!hasPosAccess) return false;
      
      if (branchId) {
          const userBranches = row.branch_ids ? String(row.branch_ids).split(',') : [];
          if (!userBranches.includes(String(branchId))) return false;
      }
      return true;
    });

    // Group by role_name
    const grouped = posUsers.reduce((acc, user) => {
      if (!acc[user.role_name]) acc[user.role_name] = [];
      acc[user.role_name].push({ username: user.username, name: user.name });
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
