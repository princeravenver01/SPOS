const http = require('http');

const data = JSON.stringify({
  cashier_id: 1,
  cashier_name: "Test",
  starting_cash: 3000
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/shifts/open',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
