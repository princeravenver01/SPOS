const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const branchId = req.query.branch_id;
        const branchIdsStr = req.query.branch_ids;
        
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
        `;
        const queryParams = [];
        
        if (branchId) {
            query += ` WHERE p.branch_id = ? `;
            queryParams.push(branchId);
        } else if (branchIdsStr) {
            const bIds = branchIdsStr.split(',').map(Number);
            if(bIds.length > 0) {
                query += ` WHERE p.branch_id IN (?) `;
                queryParams.push(bIds);
            } else {
                query += ` WHERE 1=0 `; // return none
            }
        }
        query += ` ORDER BY p.created_at DESC`;

        const [products] = await pool.query(query, queryParams);
        
        // Fetch all components and variants in bulk to minimize queries
        const [components] = await pool.query(`
            SELECT pc.*, cp.name, cp.sku 
            FROM product_components pc 
            JOIN products cp ON pc.component_product_id = cp.id
        `);
        
        const [variants] = await pool.query('SELECT * FROM product_variants');
        const [productModifiers] = await pool.query('SELECT * FROM product_modifiers');
        const [modifiers] = await pool.query('SELECT * FROM modifiers');
        const [modifierOptions] = await pool.query('SELECT * FROM modifier_options');

        // Stitch them together
        const fullProducts = products.map(p => {
            // Find modifiers for this product
            const pModIds = productModifiers.filter(pm => pm.product_id === p.id).map(pm => pm.modifier_id);
            const pMods = modifiers.filter(m => pModIds.includes(m.id)).map(m => ({
                ...m,
                is_required: !!m.is_required,
                options: modifierOptions.filter(opt => opt.modifier_id === m.id)
            }));

            return {
                ...p,
                is_available: !!p.is_available,
                is_composite: !!p.is_composite,
                use_production: !!p.use_production,
                track_stock: !!p.track_stock,
                components: components.filter(c => c.parent_product_id === p.id).map(c => ({
                    id: c.component_product_id,
                    name: c.name,
                    sku: c.sku,
                    qty: c.quantity,
                    cost: c.cost
                })),
                generatedVariants: variants.filter(v => v.product_id === p.id),
                hasVariants: variants.filter(v => v.product_id === p.id).length > 0,
                modifiers: pMods
            };
        });

        res.json(fullProducts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { 
            branch_id, name, category_id, description, is_available, sold_by, 
            price, cost, sku, barcode, 
            is_composite, use_production, components, 
            track_stock, in_stock, low_stock, 
            hasVariants, generatedVariants, 
            label_color, image_url, modifiers 
        } = req.body;

        if (!branch_id) {
            return res.status(400).json({ error: 'branch_id is required' });
        }

        // 1. Insert base product
        const [prodResult] = await connection.query(
            `INSERT INTO products (
                branch_id, name, category_id, description, is_available, sold_by, 
                price, cost, sku, barcode, is_composite, use_production, track_stock, 
                in_stock, low_stock, label_color, image_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                branch_id, name, category_id || null, description, is_available ? 1 : 0, sold_by || 'each',
                price || 0, cost || 0, sku || null, barcode || null, is_composite ? 1 : 0, use_production ? 1 : 0, track_stock ? 1 : 0,
                in_stock || 0, low_stock || 0, label_color || '#fbbd05', image_url || null
            ]
        );
        const productId = prodResult.insertId;

        // 2. Insert components if composite
        if (is_composite && components && components.length > 0) {
            const compValues = components.map(c => [productId, c.id, c.qty || 1, c.cost || 0]);
            await connection.query(
                'INSERT INTO product_components (parent_product_id, component_product_id, quantity, cost) VALUES ?',
                [compValues]
            );
        }

        // 3. Insert variants if has variants
        if (hasVariants && generatedVariants && generatedVariants.length > 0) {
            const varValues = generatedVariants.map(v => [productId, v.name, v.sku || null, v.price || 0, v.stock || 0]);
            await connection.query(
                'INSERT INTO product_variants (product_id, name, sku, price, stock) VALUES ?',
                [varValues]
            );
        }

        // 4. Insert modifiers
        if (modifiers && modifiers.length > 0) {
            const modValues = modifiers.map(mId => [productId, mId]);
            await connection.query(
                'INSERT INTO product_modifiers (product_id, modifier_id) VALUES ?',
                [modValues]
            );
        }

        await connection.commit();
        res.status(201).json({ id: productId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'SKU or Barcode already exists' });
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

router.put('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { 
            branch_id, name, category_id, description, is_available, sold_by, 
            price, cost, sku, barcode, 
            is_composite, use_production, components, 
            track_stock, in_stock, low_stock, 
            hasVariants, generatedVariants, 
            label_color, image_url, modifiers 
        } = req.body;

        // Fetch current stock to compare
        const [currentRows] = await connection.query('SELECT in_stock FROM products WHERE id = ?', [id]);
        const currentStock = currentRows.length > 0 ? currentRows[0].in_stock : 0;

        // 1. Update base product
        await connection.query(
            `UPDATE products SET 
                branch_id=?, name=?, category_id=?, description=?, is_available=?, sold_by=?, 
                price=?, cost=?, sku=?, barcode=?, is_composite=?, use_production=?, track_stock=?, 
                in_stock=?, low_stock=?, label_color=?, image_url=?
            WHERE id=?`,
            [
                branch_id, name, category_id || null, description, is_available ? 1 : 0, sold_by || 'each',
                price || 0, cost || 0, sku || null, barcode || null, is_composite ? 1 : 0, use_production ? 1 : 0, track_stock ? 1 : 0,
                in_stock || 0, low_stock || 0, label_color || '#fbbd05', image_url || null,
                id
            ]
        );

        // 1a. Log stock adjustment if changed
        if (track_stock && in_stock !== undefined && parseFloat(in_stock) !== parseFloat(currentStock)) {
            const adjustment = parseFloat(in_stock) - parseFloat(currentStock);
            await connection.query(
                `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id, branch_id, 'Admin', 'Manual Adjustment', adjustment, in_stock]
            );
        }

        // 2. Sync components
        await connection.query('DELETE FROM product_components WHERE parent_product_id = ?', [id]);
        if (is_composite && components && components.length > 0) {
            const compValues = components.map(c => [id, c.id, c.qty || 1, c.cost || 0]);
            await connection.query(
                'INSERT INTO product_components (parent_product_id, component_product_id, quantity, cost) VALUES ?',
                [compValues]
            );
        }

        // 3. Sync variants
        await connection.query('DELETE FROM product_variants WHERE product_id = ?', [id]);
        if (hasVariants && generatedVariants && generatedVariants.length > 0) {
            const varValues = generatedVariants.map(v => [id, v.name, v.sku || null, v.price || 0, v.stock || 0]);
            await connection.query(
                'INSERT INTO product_variants (product_id, name, sku, price, stock) VALUES ?',
                [varValues]
            );
        }

        // 4. Sync modifiers
        await connection.query('DELETE FROM product_modifiers WHERE product_id = ?', [id]);
        if (modifiers && modifiers.length > 0) {
            const modValues = modifiers.map(mId => [id, mId]);
            await connection.query(
                'INSERT INTO product_modifiers (product_id, modifier_id) VALUES ?',
                [modValues]
            );
        }

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'SKU or Barcode already exists' });
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

router.delete('/:id', async (req, res) => {
    try {
        // DELETE CASCADE handles components and variants
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/sync', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { target_branch_id } = req.body;
        const source_product_id = req.params.id;

        if (!target_branch_id) {
            return res.status(400).json({ error: 'target_branch_id is required' });
        }

        // Helper function to clone a product recursively
        const cloneProduct = async (prodId) => {
            const [prods] = await connection.query('SELECT * FROM products WHERE id = ?', [prodId]);
            if (prods.length === 0) return null;
            const src = prods[0];

            let existingProdQuery = 'SELECT id FROM products WHERE branch_id = ? AND name = ?';
            let existingProdParams = [target_branch_id, src.name];
            
            if (src.sku) {
                existingProdQuery = 'SELECT id FROM products WHERE branch_id = ? AND sku = ?';
                existingProdParams = [target_branch_id, src.sku];
            }

            const [existing] = await connection.query(existingProdQuery, existingProdParams);
            if (existing.length > 0) {
                if (prodId === source_product_id) {
                    throw new Error('ALREADY_EXISTS');
                }
                return existing[0].id; // Already exists in target branch (for nested components, we just reuse it)
            }

            const [insertResult] = await connection.query(
                `INSERT INTO products (
                    branch_id, name, category_id, description, is_available, sold_by, 
                    price, cost, sku, barcode, is_composite, track_stock, 
                    in_stock, low_stock, label_color, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    target_branch_id, src.name, src.category_id, src.description, src.is_available, src.sold_by,
                    src.price, src.cost, src.sku, src.barcode, src.is_composite, src.track_stock,
                    0, src.low_stock, src.label_color, src.image_url // Inventory starts at 0
                ]
            );
            const newProductId = insertResult.insertId;

            const [variants] = await connection.query('SELECT * FROM product_variants WHERE product_id = ?', [prodId]);
            if (variants.length > 0) {
                const varValues = variants.map(v => [newProductId, v.name, v.sku, v.price, 0]);
                await connection.query(
                    'INSERT INTO product_variants (product_id, name, sku, price, stock) VALUES ?',
                    [varValues]
                );
            }

            if (src.is_composite) {
                const [components] = await connection.query('SELECT * FROM product_components WHERE parent_product_id = ?', [prodId]);
                if (components.length > 0) {
                    const compValues = [];
                    for (const comp of components) {
                        const newCompId = await cloneProduct(comp.component_product_id);
                        if (newCompId) {
                            compValues.push([newProductId, newCompId, comp.quantity, comp.cost]);
                        }
                    }
                    if (compValues.length > 0) {
                        await connection.query(
                            'INSERT INTO product_components (parent_product_id, component_product_id, quantity, cost) VALUES ?',
                            [compValues]
                        );
                    }
                }
            }

            return newProductId;
        };

        const newId = await cloneProduct(source_product_id);
        if (!newId) throw new Error('Source product not found');

        await connection.commit();
        res.json({ success: true, new_product_id: newId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        if (err.message === 'ALREADY_EXISTS') {
            return res.status(400).json({ error: 'Product is already synced to this branch.' });
        }
        res.status(500).json({ error: 'Server error during sync' });
    } finally {
        connection.release();
    }
});

module.exports = router;
