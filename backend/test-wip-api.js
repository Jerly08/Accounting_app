const http = require('http');

// Test the WIP analysis by age endpoint
console.log('Testing /api/wip/analysis/by-age endpoint...');
http.get('http://localhost:5000/api/wip/analysis/by-age', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('Response:', JSON.parse(data));
    } else {
      console.log('Error Response:', data);
    }
    
    // Now test the trends endpoint
    console.log('\nTesting /api/wip/analysis/trends endpoint...');
    http.get('http://localhost:5000/api/wip/analysis/trends', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        if (res.statusCode === 200) {
          console.log('Response:', JSON.parse(data));
        } else {
          console.log('Error Response:', data);
        }
      });
    }).on('error', (err) => {
      console.error('Error testing trends endpoint:', err);
    });
  });
}).on('error', (err) => {
  console.error('Error testing by-age endpoint:', err);
}); 