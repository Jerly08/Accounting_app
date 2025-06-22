const http = require('http');

// Define test token - replace with a valid token for your application
const testToken = 'YOUR_TEST_TOKEN';

// Test the WIP analysis by age endpoint with authentication
console.log('Testing /api/wip/analysis/by-age endpoint with authentication...');
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/wip/analysis/by-age',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${testToken}`
  }
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('Response:', JSON.parse(data));
    } else {
      console.log('Error Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end(); 