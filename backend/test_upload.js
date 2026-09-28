const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function test() {
    try {
        const form = new FormData();
        form.append('branch_id', '1');
        form.append('name', 'Test Area');
        form.append('type', 'Indoor');
        // create dummy file
        fs.writeFileSync('dummy.jpg', 'dummy');
        form.append('map_image', fs.createReadStream('dummy.jpg'));

        const response = await axios.post('http://localhost:5000/api/areas', form, {
            headers: form.getHeaders()
        });
        console.log('Success:', response.data);
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}
test();
