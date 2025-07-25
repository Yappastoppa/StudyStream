# GPS Location Access Guide for GhostRacer

## The Issue: "Loading GPS Map..." Stuck Screen

If you see "Location access required" or "Loading GPS Map..." that never loads, this is due to browser security restrictions in the Replit preview iframe.

## Why This Happens

- **Replit Preview (iframe)**: Browser sandboxing prevents real GPS access
- **Location permission**: Granted to replit.com, but not passed to the embedded app
- **Result**: App waits forever for location data that never arrives

## Solution: Open in New Browser Tab

### Step 1: Get Your App URL
1. Look for the **"Open in new tab"** button in Replit preview (external link icon)
2. Or copy the full URL from your preview (looks like: `https://xxx-xxx.spock.replit.dev/`)

### Step 2: Open in New Tab
1. Paste the URL in a new browser tab
2. Refresh the page to get a fresh start
3. You'll see a new location permission prompt
4. Click **"Allow"** when prompted

### Step 3: Verify GPS Works
- The map should center on your actual location
- You should see your position marker
- The "Loading GPS Map..." message should disappear

## Browser Requirements

- **Best**: Chrome, Safari, or Firefox
- **Required**: Location Services enabled on your device
- **Check**: No location blocking in address bar

## If Still Not Working

1. **System Settings**: Enable Location Services on your device
2. **Browser Settings**: Clear any blocked location permissions
3. **Address Bar**: Look for location blocked icon and manually allow
4. **Restart**: Close and reopen browser if stuck

## Expected Behavior

✅ **Working**: Map loads your real location, shows dark racing theme  
❌ **Not Working**: Stuck on "Loading GPS Map..." or shows NYC simulation mode

## Note About Maps

Currently using simulation mode due to Mapbox token. You'll see:
- Functional GPS tracking
- Dark racing theme
- All app features working
- Simulated map tiles instead of real Mapbox tiles

To get real map tiles, update the Mapbox token in Replit Secrets with a fresh token from your Mapbox account.