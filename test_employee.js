async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/employees');
        const employees = await res.json();
        console.log("Employees before:", employees.map(e => ({ id: e.id, branch_ids: e.branch_ids })));
        
        if (employees.length > 0) {
            const emp = employees[0];
            const payload = {
                ...emp,
                branch_ids: [1, 2] // Attempt to assign branches 1 and 2
            };
            
            const putRes = await fetch(`http://localhost:5000/api/employees/${emp.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const putData = await putRes.json();
            console.log("PUT Response:", putRes.status, putData);
            
            const res2 = await fetch('http://localhost:5000/api/employees');
            const employees2 = await res2.json();
            console.log("Employees after:", employees2.map(e => ({ id: e.id, branch_ids: e.branch_ids })));
        }
    } catch (e) {
        console.error(e);
    }
}

test();
