const { execSync } = require('child_process');
const path = require('path');

console.log('Starting fixed assets reset and seed process...');

try {
  // Run reset script
  console.log('\n=== Running reset script ===');
  execSync('node ' + path.join(__dirname, 'fixedasset-reset.js'), { stdio: 'inherit' });
  
  // Run seed script
  console.log('\n=== Running seed script ===');
  execSync('node ' + path.join(__dirname, 'fixedasset-seed.js'), { stdio: 'inherit' });
  
  console.log('\nFixed assets reset and seed process completed successfully!');
} catch (error) {
  console.error('\nError in reset-seed process:', error.message);
  process.exit(1);
} 