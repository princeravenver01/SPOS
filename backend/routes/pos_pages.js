const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all pos pages and their items
router.get('/', async (req, res) => {
    try {
        const [pages] = await db.query('SELECT * FROM pos_pages ORDER BY sort_order ASC, id ASC');
        
        // Fetch all items for all pages
        const [items] = await db.query(`
            SELECT pi.*, 
                   p.name as product_name, p.price as product_price, p.image_url as product_image_url, p.label_color as product_label_color, p.in_stock, p.track_stock,
                   c.name as category_name, c.color as category_color,
                   d.name as discount_name, d.value as discount_value, d.type as discount_type
            FROM pos_page_items pi
            LEFT JOIN products p ON pi.type = 'product' AND pi.reference_id = p.id
            LEFT JOIN categories c ON pi.type = 'category' AND pi.reference_id = c.id
            LEFT JOIN discounts d ON pi.type = 'discount' AND pi.reference_id = d.id
        `);

        // Group items by page
        const pagesWithItems = pages.map(page => {
            const pageItems = items.filter(item => item.page_id === page.id).map(item => {
                let displayData = {};
                if (item.type === 'product') {
                    displayData = {
                        name: item.product_name,
                        price: item.product_price,
                        image_url: item.product_image_url,
                        label_color: item.product_label_color,
                        in_stock: item.in_stock,
                        track_stock: item.track_stock,
                        is_available: true // Assuming available if it's on the grid, or we could fetch this too
                    };
                } else if (item.type === 'category') {
                    displayData = {
                        name: item.category_name,
                        color: item.category_color
                    };
                } else if (item.type === 'discount') {
                    displayData = {
                        name: item.discount_name,
                        value: item.discount_value,
                        discount_type: item.discount_type
                    };
                }

                return {
                    id: item.id,
                    grid_index: item.grid_index,
                    type: item.type,
                    reference_id: item.reference_id,
                    ...displayData
                };
            });

            return {
                ...page,
                items: pageItems
            };
        });

        res.json(pagesWithItems);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
});

// POST new page
router.post('/', async (req, res) => {
    const { name, sort_order } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO pos_pages (name, sort_order) VALUES (?, ?)',
            [name || 'New Page', sort_order || 0]
        );
        res.status(201).json({ id: result.insertId, name: name || 'New Page', sort_order: sort_order || 0, items: [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create page' });
    }
});

// PUT update page
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, sort_order } = req.body;
    try {
        await db.query(
            'UPDATE pos_pages SET name = ?, sort_order = ? WHERE id = ?',
            [name, sort_order, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update page' });
    }
});

// DELETE page
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM pos_pages WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete page' });
    }
});

// PUT update items for a page
router.put('/:id/items', async (req, res) => {
    const { id } = req.params;
    const { items } = req.body; // Array of { grid_index, type, reference_id }

    try {
        await db.query('START TRANSACTION');

        // Delete existing items for this page
        await db.query('DELETE FROM pos_page_items WHERE page_id = ?', [id]);

        // Insert new items
        if (items && items.length > 0) {
            const values = items.map(item => [
                id, item.grid_index, item.type, item.reference_id
            ]);
            
            await db.query(
                'INSERT INTO pos_page_items (page_id, grid_index, type, reference_id) VALUES ?',
                [values]
            );
        }

        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update page items' });
    }
});

module.exports = router;
