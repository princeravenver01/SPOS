const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'pos_frontend/src/components/PosTerminal.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const url = 'http:\/\/localhost:5000\/api\/products'/g,
    "const url = `http://localhost:5000/api/products?branch_id=${cashier?.activeBranch?.id || ''}`"
);

// We should also look for api/categories
content = content.replace(
    /fetch\('http:\/\/localhost:5000\/api\/categories'\)/g,
    "fetch(`http://localhost:5000/api/categories?branch_id=${cashier?.activeBranch?.id || ''}`)"
);

// And we need to make sure the POST /api/orders/create uses the correct branch ID if we didn't get it right before.
content = content.replace(
    /const payload = {([^]*?)items: cart.map/g,
    (match, p1) => {
        if (p1.includes('branch_id')) return match;
        return `const payload = {${p1}branch_id: cashier?.activeBranch?.id,\n                items: cart.map`;
    }
);

fs.writeFileSync(file, content);
console.log('PosTerminal.jsx updated again');
