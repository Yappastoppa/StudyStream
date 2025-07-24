
#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Read the Mapbox token from .env.local
let mapboxToken = '';
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const tokenMatch = envContent.match(/VITE_MAPBOX_TOKEN=(.+)/);
  if (tokenMatch) {
    mapboxToken = tokenMatch[1].trim();
  }
} catch (error) {
  console.error('❌ Could not read .env.local file:', error.message);
  process.exit(1);
}

if (!mapboxToken) {
  console.error('❌ No Mapbox token found in .env.local');
  process.exit(1);
}

console.log('🗺️  MAPBOX API TESTER');
console.log('===================');
console.log(`Token: ${mapboxToken.substring(0, 15)}...`);
console.log('');

// Test 1: Get account info
function testAccount() {
  return new Promise((resolve, reject) => {
    console.log('📡 Test 1: Account Info');
    const url = `https://api.mapbox.com/accounts/v1?access_token=${mapboxToken}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const account = JSON.parse(data);
          console.log(`✅ Account: ${account.username || 'Unknown'}`);
          console.log(`   ID: ${account.id || 'Unknown'}`);
          resolve(account);
        } else {
          console.log(`❌ Status: ${res.statusCode}`);
          console.log(`   Response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// Test 2: Get Standard style
function testStandardStyle() {
  return new Promise((resolve, reject) => {
    console.log('📡 Test 2: Standard Style');
    const url = `https://api.mapbox.com/styles/v1/mapbox/standard?access_token=${mapboxToken}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const style = JSON.parse(data);
          console.log(`✅ Style: ${style.name || 'Standard'}`);
          console.log(`   Version: ${style.version || 'Unknown'}`);
          console.log(`   Owner: ${style.owner || 'mapbox'}`);
          resolve(style);
        } else {
          console.log(`❌ Status: ${res.statusCode}`);
          console.log(`   Response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// Test 3: Get geocoding (reverse geocode NYC)
function testGeocoding() {
  return new Promise((resolve, reject) => {
    console.log('📡 Test 3: Geocoding (NYC)');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/-74.006,40.7128.json?access_token=${mapboxToken}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const geocode = JSON.parse(data);
          if (geocode.features && geocode.features.length > 0) {
            const place = geocode.features[0];
            console.log(`✅ Location: ${place.place_name}`);
            console.log(`   Coordinates: ${place.center[0]}, ${place.center[1]}`);
          } else {
            console.log('✅ Geocoding works but no results');
          }
          resolve(geocode);
        } else {
          console.log(`❌ Status: ${res.statusCode}`);
          console.log(`   Response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// Test 4: Get map tiles (just check if endpoint responds)
function testTiles() {
  return new Promise((resolve, reject) => {
    console.log('📡 Test 4: Tile Service');
    // Test a basic tile request
    const url = `https://api.mapbox.com/styles/v1/mapbox/standard/tiles/256/1/0/0?access_token=${mapboxToken}`;
    
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Tiles: Available');
        console.log(`   Content-Type: ${res.headers['content-type']}`);
        console.log(`   Content-Length: ${res.headers['content-length']} bytes`);
        resolve(true);
      } else {
        console.log(`❌ Tiles Status: ${res.statusCode}`);
        reject(new Error(`HTTP ${res.statusCode}`));
      }
      // Don't actually download the tile data
      res.destroy();
    }).on('error', reject);
  });
}

// Run all tests
async function runTests() {
  const tests = [
    { name: 'Account Info', fn: testAccount },
    { name: 'Standard Style', fn: testStandardStyle },
    { name: 'Geocoding', fn: testGeocoding },
    { name: 'Tiles', fn: testTiles }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} failed: ${error.message}`);
      failed++;
    }
    console.log(''); // Empty line between tests
  }

  console.log('📊 SUMMARY');
  console.log('==========');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (passed === tests.length) {
    console.log('🎉 All Mapbox API tests passed! Your token is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check your token and network connection.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite crashed:', error.message);
  process.exit(1);
});
