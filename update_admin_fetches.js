const fs = require('fs');
const path = require('path');

const updateBackendFile = (filename, tableName, prefix) => {
    const file = path.join(__dirname, 'backend/routes', filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // add branch_ids support
    if (!content.includes('branchIdsStr')) {
        content = content.replace(
            /const branchId = req.query.branch_id;/,
            "const branchId = req.query.branch_id;\n        const branchIdsStr = req.query.branch_ids;"
        );
        content = content.replace(
            /if \(branchId\) \{([\s\S]*?)queryParams\.push\(branchId\);\n        \}/,
            `if (branchId) {
            query += \` WHERE ${prefix}.branch_id = ? \`;
            queryParams.push(branchId);
        } else if (branchIdsStr) {
            const bIds = branchIdsStr.split(',').map(Number);
            if(bIds.length > 0) {
                query += \` WHERE ${prefix}.branch_id IN (?) \`;
                queryParams.push(bIds);
            } else {
                query += \` WHERE 1=0 \`; // return none
            }
        }`
        );
        fs.writeFileSync(file, content);
        console.log(`${filename} updated`);
    }
};

updateBackendFile('products.js', 'products', 'p');
updateBackendFile('categories.js', 'categories', 'c');
updateBackendFile('modifiers.js', 'modifiers', 'm');

// Update orders.js
const ordersFile = path.join(__dirname, 'backend/routes/orders.js');
let oContent = fs.readFileSync(ordersFile, 'utf8');
if (!oContent.includes('branchIdsStr')) {
    oContent = oContent.replace(
        /const branchId = req.query.branch_id;/,
        "const branchId = req.query.branch_id;\n    const branchIdsStr = req.query.branch_ids;"
    );
    oContent = oContent.replace(
        /if \(branchId\) \{\n        query \+= \` AND o.branch_id = \?`;\n        params.push\(branchId\);\n    \}/,
        `if (branchId) {
        query += \` AND o.branch_id = ?\`;
        params.push(branchId);
    } else if (branchIdsStr) {
        const bIds = branchIdsStr.split(',').map(Number);
        if(bIds.length > 0) {
            query += \` AND o.branch_id IN (?)\`;
            params.push(bIds);
        } else {
            query += \` AND 1=0 \`;
        }
    }`
    );
    fs.writeFileSync(ordersFile, oContent);
    console.log('orders.js updated');
}

// Now update AdminProducts.jsx, AdminCategories.jsx, AdminModifiers.jsx to pass branch_ids if adminUser has them.
const updateFrontendFile = (filename, endpoints) => {
    const file = path.join(__dirname, 'frontend/src/components', filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('const adminUser =')) {
        content = content.replace(
            /const navigate = useNavigate\(\);/,
            "const navigate = useNavigate();\n    const adminUser = JSON.parse(localStorage.getItem('spos_admin') || '{}');\n    const branchIdsQuery = adminUser.branch_ids ? `branch_ids=${adminUser.branch_ids.join(',')}` : '';"
        );
        
        endpoints.forEach(ep => {
            const regex = new RegExp(`fetch\\\(\\\`http:\\/\\/localhost:5000\\/api\\/${ep}\\\?branch_id=\\\$\\{branchId\\}\\\`\\\)`, 'g');
            // wait, some might just be fetch('http://localhost:5000/api/categories')
            content = content.replace(
                new RegExp(`fetch\\\('http:\\/\\/localhost:5000\\/api\\/${ep}'\\\)`, 'g'),
                `fetch(\`http://localhost:5000/api/${ep}?\${branchIdsQuery}\`)`
            );
            // replace the ones that use ?branch_id=${branchId}
            content = content.replace(
                new RegExp(`fetch\\\(\\\`http:\\/\\/localhost:5000\\/api\\/${ep}\\\?branch_id=\\\$\\{branchId\\}\\\`\\\)`, 'g'),
                `fetch(\`http://localhost:5000/api/${ep}?branch_id=\${branchId}\`)` // keep as is if branchId is specified
            );
        });
        
        // Also fix the case where it fetches without branchId
        // `fetch(http://localhost:5000/api/categories)` -> `fetch(http://localhost:5000/api/categories?${branchIdsQuery})`

        fs.writeFileSync(file, content);
        console.log(`${filename} updated`);
    }
}

updateFrontendFile('AdminProducts.jsx', ['categories', 'modifiers', 'products']);
