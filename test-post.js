const http = require('http');

const data = JSON.stringify({
  name: 'Prueba Consultor',
  email: 'prueba.consultor@test.com',
  password: 'password123',
  role: 'Consultor',
  active: true
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
