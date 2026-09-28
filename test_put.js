async function test() {
    try {
        const payload = {
            username: 'cashier01',
            role_id: 3,
            name: 'Borge Go',
            email: 'borge@gmail.com',
            phone: '09922929292',
            branch_ids: [1, 2] // trying to assign branches 1 and 2
        };
        const putRes = await fetch(`http://localhost:5000/api/employees/2`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const status = putRes.status;
        const text = await putRes.text();
        console.log(`PUT Response Status: ${status}`);
        console.log(`PUT Response Body: ${text}`);

        // also check database manually to see if user_branches has it
        const res2 = await fetch('http://localhost:5000/api/employees');
        const text2 = await res2.text();
        console.log(`GET Employees Response: ${text2.substring(0, 500)}...`);
    } catch (e) {
        console.error(e);
    }
}
test();
