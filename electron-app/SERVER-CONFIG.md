# Configuring Server Connection

The Electron app can connect to different server locations.

## Option 1: Edit config.js (Simple)

Open `electron-app/config.js` and change the `host` value:

```javascript
server: {
  host: 'http://192.168.1.100:6030',  // Change this to your server IP
  startupDelay: 3000
}
```

**Examples:**
- Local server: `'http://localhost:6030'`
- LAN server: `'http://192.168.1.100:6030'`
- Remote server: `'http://server.example.com:6030'`

After changing, rebuild the Electron app:
```bash
npm run electron:build
```

## Option 2: Use Environment Variable (Advanced)

Set the `SERVER_HOST` environment variable before running:

**Windows:**
```cmd
set SERVER_HOST=http://192.168.1.100:6030
npm run electron:start
```

**Or build with custom server:**
```cmd
set SERVER_HOST=http://192.168.1.100:6030
npm run electron:build
```

## Running Server Separately

If you want to run the server on a different machine:

1. Copy the `.next/standalone/` folder to the server machine
2. On the server machine, edit `.env` to set the port (default: 6030)
3. Run `start-server.bat` (Windows) or `node server.js`
4. Note the server's IP address (e.g., 192.168.1.100)
5. On client machines, edit `electron-app/config.js` to point to that IP and port
6. Build and distribute the Electron app

## Port Configuration

### Server Port (Standalone)

**Option 1 - Edit .env (Easiest):**
1. Open `.next/standalone/.env` or `dist-server/.env`
2. Change: `PORT=6030` to your desired port
3. Save and run `start-server.bat`

**Option 2 - Environment Variable:**
```bash
set PORT=8080
node server.js
```

### Client Port (Electron)

Edit `electron-app/config.js`:
```javascript
host: 'http://localhost:8080',  // Match your server port
```

## Using Settings UI

The Electron client has a built-in settings UI accessible via:
- Menu: File > Settings
- Keyboard: Ctrl+, (Cmd+, on Mac)

This allows changing the server URL without editing config files.
