const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Starting app ===');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

// List current directory
console.log('Listing files in current directory:');
try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    const stats = fs.statSync(file);
    console.log(`${stats.isDirectory() ? 'd' : '-'} ${file}`);
  });
} catch (e) {
  console.log('Error listing current directory:', e.message);
}

// List parent directory
console.log('Listing parent directory:');
try {
  const files = fs.readdirSync('..');
  files.forEach(file => {
    const stats = fs.statSync(path.join('..', file));
    console.log(`${stats.isDirectory() ? 'd' : '-'} ${file}`);
  });
} catch (e) {
  console.log('Error listing parent directory:', e.message);
}

// Check for dist directory
console.log('Looking for dist directory:');

if (fs.existsSync('dist')) {
  console.log('Found dist in current directory');
  try {
    const distFiles = fs.readdirSync('dist');
    console.log('Dist contents:', distFiles);
    require('./dist/index.js');
  } catch (e) {
    console.log('Error running from current dist:', e.message);
  }
} else if (fs.existsSync('../dist')) {
  console.log('Found dist in parent directory');
  try {
    const distFiles = fs.readdirSync('../dist');
    console.log('Parent dist contents:', distFiles);
    require('../dist/index.js');
  } catch (e) {
    console.log('Error running from parent dist:', e.message);
  }
} else {
  console.log('dist directory not found, trying to build...');
  try {
    // Stay in current directory - package.json is here!
    console.log('Running build in current directory (where package.json is)...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('After build, listing files:');
    const files = fs.readdirSync('.');
    files.forEach(file => {
      const stats = fs.statSync(file);
      console.log(`${stats.isDirectory() ? 'd' : '-'} ${file}`);
    });
    
    if (fs.existsSync('dist')) {
      console.log('Build successful, starting app...');
      require('./dist/index.js');
    } else {
      console.log('Build failed - no dist directory created');
    }
  } catch (e) {
    console.log('Error during build:', e.message);
  }
}
