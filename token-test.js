
#!/usr/bin/env node

const fs = require('fs');

// Read token from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = envContent.match(/VITE_MAPBOX_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : '';

console.log('🔍 TOKEN ANALYSIS');
console.log('==================');
console.log(`Raw token: "${token}"`);
console.log(`Length: ${token.length}`);
console.log(`Starts with pk.: ${token.startsWith('pk.')}`);
console.log(`Has whitespace: ${/\s/.test(token)}`);
console.log(`Encoded bytes: ${Buffer.from(token).toString('hex')}`);

// Test if it's a valid JWT format
const parts = token.split('.');
console.log(`JWT parts: ${parts.length} (should be 3)`);

if (parts.length === 3) {
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    console.log('JWT Header:', header);
    console.log('JWT Payload:', payload);
    console.log(`User: ${payload.u || 'unknown'}`);
    console.log(`Expires: ${payload.exp ? new Date(payload.exp * 1000) : 'never'}`);
  } catch (e) {
    console.log('❌ Invalid JWT format:', e.message);
  }
}
