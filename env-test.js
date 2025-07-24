
#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 ENVIRONMENT TEST');
console.log('===================');

// Check .env.local file
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  console.log('📄 .env.local contents:');
  console.log(envContent);
  
  const tokenMatch = envContent.match(/VITE_MAPBOX_TOKEN=(.+)/);
  if (tokenMatch) {
    const token = tokenMatch[1].trim();
    console.log(`\n✅ Token found: ${token.substring(0, 15)}...`);
    console.log(`📏 Length: ${token.length}`);
    console.log(`🏷️  Format: ${token.startsWith('pk.') ? 'Valid' : 'Invalid'}`);
  } else {
    console.log('❌ No VITE_MAPBOX_TOKEN found in .env.local');
  }
} catch (error) {
  console.log('❌ Cannot read .env.local:', error.message);
}

// Check if Vite can access it (simulate)
console.log('\n🏗️  Vite Environment Simulation:');
console.log(`VITE_MAPBOX_TOKEN would be: ${process.env.VITE_MAPBOX_TOKEN || 'undefined'}`);
