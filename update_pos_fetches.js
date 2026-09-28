const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'pos_frontend/src/components/PosTerminal.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. orders/open
content = content.replace(
    /fetch\('http:\/\/localhost:5000\/api\/orders\/open'\)/g,
    "fetch(`http://localhost:5000/api/orders/open?branch_id=${cashier?.activeBranch?.id || ''}`)"
);

// 2. pos_pages
content = content.replace(
    /fetch\('http:\/\/localhost:5000\/api\/pos_pages'\)/g,
    "fetch(`http://localhost:5000/api/pos_pages?branch_id=${cashier?.activeBranch?.id || ''}`)"
);

// 3. shifts/current
content = content.replace(
    /fetch\('http:\/\/localhost:5000\/api\/shifts\/current'\)/g,
    "fetch(`http://localhost:5000/api/shifts/current?branch_id=${cashier?.activeBranch?.id || ''}`)"
);

// 4. products (in ItemsGrid.jsx? Wait, PosTerminal doesn't fetch products? Oh, ItemsGrid fetches products? Let's check ItemsGrid next.)

// 5. orders/create payload
content = content.replace(
    /const payload = \{([\s\S]*?)items: cart.map/g,
    "const payload = {$1branch_id: cashier?.activeBranch?.id,\n                items: cart.map"
);
content = content.replace(
    /body: JSON.stringify\(\{([\s\S]*?)total_amount: 0,\n                                                                                status: 'open'/g,
    "body: JSON.stringify({$1branch_id: cashier?.activeBranch?.id,\n                                                                                total_amount: 0,\n                                                                                status: 'open'"
);

// 6. Header
content = content.replace(
    /<span className="text-xl font-bold tracking-widest text-butterscotch uppercase flex items-center gap-2">([\s\S]*?)<\/span>/g,
    `<span className="text-xl font-bold tracking-widest text-butterscotch uppercase flex items-center gap-2">$1</span>\n                    {cashier?.activeBranch && <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full text-white ml-2">{cashier.activeBranch.name}</span>}`
);

fs.writeFileSync(file, content);
console.log('PosTerminal.jsx updated');
