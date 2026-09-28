const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reports/sales-summary
router.get('/sales-summary', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            // Build where clause
            let whereClause = "WHERE 1=1";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            // 1. Get Totals
            const totalsQuery = `
                SELECT 
                    IFNULL(SUM(o.gross_amount), 0) as gross_sales,
                    IFNULL(SUM(o.refund_amount), 0) as refunds,
                    IFNULL(SUM(o.discount_amount), 0) as discounts,
                    IFNULL(SUM(o.net_amount), 0) as net_sales
                FROM orders o
                ${whereClause}
            `;
            const [totalsResult] = await connection.execute(totalsQuery, params);
            let totals = totalsResult[0];

            // 2. Get COGS
            const cogsQuery = `
                SELECT 
                    IFNULL(SUM(oi.cost_at_time * oi.quantity), 0) as cogs
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                ${whereClause}
            `;
            const [cogsResult] = await connection.execute(cogsQuery, params);
            totals.cogs = cogsResult[0].cogs;
            totals.gross_profit = Number(totals.net_sales) - Number(totals.cogs);

            // 3. Get Chart Data (Grouped by Date)
            const chartQuery = `
                SELECT 
                    DATE_FORMAT(o.created_at, '%Y-%m-%d') as date,
                    IFNULL(SUM(o.gross_amount), 0) as gross_sales,
                    IFNULL(SUM(o.refund_amount), 0) as refunds,
                    IFNULL(SUM(o.discount_amount), 0) as discounts,
                    IFNULL(SUM(o.net_amount), 0) as net_sales
                FROM orders o
                ${whereClause}
                GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
                ORDER BY date ASC
            `;
            const [chartDataResult] = await connection.execute(chartQuery, params);

            // Fetch COGS per day to calculate daily gross profit
            const cogsChartQuery = `
                SELECT 
                    DATE_FORMAT(o.created_at, '%Y-%m-%d') as date,
                    IFNULL(SUM(oi.cost_at_time * oi.quantity), 0) as cogs
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                ${whereClause}
                GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
            `;
            const [cogsChartResult] = await connection.execute(cogsChartQuery, params);
            
            // Map COGS into chartData
            const chartData = chartDataResult.map(day => {
                const cogsData = cogsChartResult.find(c => c.date === day.date) || { cogs: 0 };
                return {
                    ...day,
                    cogs: cogsData.cogs,
                    gross_profit: Number(day.net_sales) - Number(cogsData.cogs)
                };
            });

            res.json({
                success: true,
                totals: totals,
                chartData: chartData
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching sales summary:", error);
        res.status(500).json({ error: "Failed to fetch sales summary." });
    }
});

// GET /api/reports/sales-by-item
router.get('/sales-by-item', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            // 1. Table Data (Sales aggregated by Item)
            const tableQuery = `
                SELECT 
                    p.name as item_name,
                    c.name as category_name,
                    IFNULL(SUM(oi.quantity), 0) as items_sold,
                    IFNULL(SUM(oi.quantity * oi.price_at_time), 0) as gross_sales,
                    0 as refunds,
                    0 as discounts,
                    IFNULL(SUM(oi.quantity * oi.price_at_time), 0) as net_sales,
                    IFNULL(SUM(oi.quantity * oi.cost_at_time), 0) as cogs,
                    IFNULL(SUM(oi.quantity * (oi.price_at_time - oi.cost_at_time)), 0) as gross_profit
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                ${whereClause}
                GROUP BY p.id, p.name, c.name
                ORDER BY net_sales DESC
            `;
            const [tableData] = await connection.execute(tableQuery, params);

            // Calculate Margin for tableData
            const formattedTableData = tableData.map(row => {
                const margin = row.net_sales > 0 ? (row.gross_profit / row.net_sales) * 100 : 0;
                return {
                    ...row,
                    margin: margin
                };
            });

            // 2. Top 5 Items
            const top5Items = formattedTableData.slice(0, 5);

            // 3. Chart Data (Total Net Sales Grouped by Date)
            // Reusing logic from sales-summary
            const chartQuery = `
                SELECT 
                    DATE_FORMAT(o.created_at, '%Y-%m-%d') as date,
                    IFNULL(SUM(o.net_amount), 0) as net_sales
                FROM orders o
                ${whereClause}
                GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
                ORDER BY date ASC
            `;
            const [chartData] = await connection.execute(chartQuery, params);

            res.json({
                success: true,
                tableData: formattedTableData,
                top5Items: top5Items,
                chartData: chartData
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching sales by item:", error);
        res.status(500).json({ error: "Failed to fetch sales by item." });
    }
});

// GET /api/reports/sales-by-category
router.get('/sales-by-category', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            const tableQuery = `
                SELECT 
                    IFNULL(c.name, 'Uncategorized') as category_name,
                    IFNULL(SUM(oi.quantity), 0) as items_sold,
                    IFNULL(SUM(oi.quantity * oi.price_at_time), 0) as net_sales,
                    IFNULL(SUM(oi.quantity * oi.cost_at_time), 0) as cogs,
                    IFNULL(SUM(oi.quantity * (oi.price_at_time - oi.cost_at_time)), 0) as gross_profit
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                ${whereClause}
                GROUP BY c.id, c.name
                ORDER BY net_sales DESC
            `;
            const [tableData] = await connection.execute(tableQuery, params);

            res.json({
                success: true,
                tableData: tableData
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching sales by category:", error);
        res.status(500).json({ error: "Failed to fetch sales by category." });
    }
});

// GET /api/reports/sales-by-employee
router.get('/sales-by-employee', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            const tableQuery = `
                SELECT 
                    IFNULL(u.name, 'Unknown Employee') as employee_name,
                    IFNULL(SUM(o.gross_amount), 0) as gross_sales,
                    IFNULL(SUM(o.refund_amount), 0) as refunds,
                    IFNULL(SUM(o.discount_amount), 0) as discounts,
                    IFNULL(SUM(o.net_amount), 0) as net_sales,
                    COUNT(o.id) as receipts,
                    IFNULL(SUM(o.net_amount) / NULLIF(COUNT(o.id), 0), 0) as average_sale
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ${whereClause}
                GROUP BY o.user_id, u.name
                ORDER BY net_sales DESC
            `;
            const [tableData] = await connection.execute(tableQuery, params);

            // Add the "Customers signed up" column which will default to 0
            const formattedData = tableData.map(row => ({
                ...row,
                customers_signed_up: 0
            }));

            res.json({
                success: true,
                tableData: formattedData
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching sales by employee:", error);
        res.status(500).json({ error: "Failed to fetch sales by employee." });
    }
});

// GET /api/reports/sales-by-payment-type
router.get('/sales-by-payment-type', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            const tableQuery = `
                SELECT 
                    IFNULL(p.payment_method, 'Unknown') as payment_type,
                    COUNT(DISTINCT o.id) as payment_transactions,
                    IFNULL(SUM(p.amount_paid), 0) as payment_amount,
                    SUM(CASE WHEN o.refund_amount > 0 THEN 1 ELSE 0 END) as refund_transactions,
                    IFNULL(SUM(o.refund_amount), 0) as refund_amount,
                    IFNULL(SUM(p.amount_paid), 0) - IFNULL(SUM(o.refund_amount), 0) as net_amount
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                ${whereClause}
                GROUP BY p.payment_method
                ORDER BY net_amount DESC
            `;
            const [tableData] = await connection.execute(tableQuery, params);

            res.json({
                success: true,
                tableData: tableData
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching sales by payment type:", error);
        res.status(500).json({ error: "Failed to fetch sales by payment type." });
    }
});

// GET /api/reports/receipts
router.get('/receipts', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            const tableQuery = `
                SELECT 
                    o.id as receipt_no,
                    o.created_at as date,
                    IFNULL(u.name, 'Unknown') as employee_name,
                    IFNULL(c.name, '') as customer_name,
                    CASE WHEN o.refund_amount > 0 THEN 'Refund' ELSE 'Sale' END as type,
                    o.total_amount as total
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN customers c ON o.customer_id = c.id
                ${whereClause}
                ORDER BY o.created_at DESC
            `;
            const [tableData] = await connection.execute(tableQuery, params);

            const allReceipts = tableData.length;
            const salesCount = tableData.filter(r => r.type === 'Sale').length;
            const refundsCount = tableData.filter(r => r.type === 'Refund').length;

            res.json({
                success: true,
                summary: {
                    allReceipts,
                    salesCount,
                    refundsCount
                },
                tableData: tableData
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching receipts:", error);
        res.status(500).json({ error: "Failed to fetch receipts." });
    }
});

// GET /api/reports/sales-by-modifier
router.get('/sales-by-modifier', async (req, res) => {
    try {
        // Since modifiers on order items are not currently tracked in the database,
        // we just return an empty array to render the exact empty state requested.
        res.json({
            success: true,
            tableData: []
        });
    } catch (error) {
        console.error("Error fetching sales by modifier:", error);
        res.status(500).json({ error: "Failed to fetch sales by modifier." });
    }
});

// GET /api/reports/sales-by-discount
router.get('/sales-by-discount', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE o.discount_amount > 0";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            const tableQuery = `
                SELECT 
                    'Manual Discount' as name,
                    COUNT(o.id) as discounts_applied,
                    SUM(o.discount_amount) as amount_discounted
                FROM orders o
                ${whereClause}
            `;
            const [tableData] = await connection.execute(tableQuery, params);

            // If count is 0, return empty array to trigger empty state
            const results = tableData[0].discounts_applied > 0 ? tableData : [];

            res.json({
                success: true,
                tableData: results
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching sales by discount:", error);
        res.status(500).json({ error: "Failed to fetch sales by discount." });
    }
});

// GET /api/reports/taxes
router.get('/taxes', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(o.created_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(o.created_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND o.user_id = ?";
                params.push(employeeId);
            }

            const query = `
                SELECT 
                    IFNULL(SUM(o.net_amount), 0) as total_net_sales
                FROM orders o
                ${whereClause}
            `;
            
            const [results] = await connection.execute(query, params);
            const totalNetSales = parseFloat(results[0].total_net_sales) || 0;

            res.json({
                success: true,
                summary: {
                    taxableSales: 0,
                    nonTaxableSales: totalNetSales,
                    totalNetSales: totalNetSales
                },
                tableData: []
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching taxes report:", error);
        res.status(500).json({ error: "Failed to fetch taxes report." });
    }
});

// GET /api/reports/shifts
router.get('/shifts', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;
        let connection = await db.getConnection();
        
        try {
            let whereClause = "WHERE status = 'closed'";
            let params = [];

            if (startDate) {
                whereClause += " AND DATE(opened_at) >= ?";
                params.push(startDate);
            }
            if (endDate) {
                whereClause += " AND DATE(opened_at) <= ?";
                params.push(endDate);
            }
            if (employeeId && employeeId !== 'all') {
                whereClause += " AND cashier_id = ?";
                params.push(employeeId);
            }

            const shiftsQuery = `
                SELECT 
                    cashier_name as pos,
                    DATE_FORMAT(opened_at, '%Y-%m-%d %H:%i:%s') as opening_time,
                    DATE_FORMAT(closed_at, '%Y-%m-%d %H:%i:%s') as closing_time,
                    expected_cash,
                    actual_cash,
                    difference
                FROM pos_shifts
                ${whereClause}
                ORDER BY opened_at DESC
            `;
            const [shiftsResult] = await connection.execute(shiftsQuery, params);

            res.json({
                success: true,
                tableData: shiftsResult
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching shifts report:", error);
        res.status(500).json({ error: "Failed to fetch shifts report." });
    }
});

module.exports = router;
