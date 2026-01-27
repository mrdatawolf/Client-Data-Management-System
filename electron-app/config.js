// Configuration for Electron app
module.exports = {
  // Server connection settings
  server: {
    // Change this to connect to a remote server
    // Examples:
    //   'http://localhost:6030'        - Local server (starts bundled server)
    //   'http://192.168.1.100:6030'    - LAN server (connects only, no local server)
    //   'http://server.example.com:6030' - Remote server (connects only)
    host: process.env.SERVER_HOST || 'http://localhost:6030',

    // Set to false to skip starting the bundled server (for remote connections)
    // Set to true to start the bundled server (for local/all-in-one mode)
    // If null/undefined, auto-detects based on host (localhost = start server)
    startBundledServer: null,

    // How long to wait for server to start (in milliseconds)
    startupDelay: 3000
  },

  // Window settings
  window: {
    width: 1400,
    height: 1024,
    title: 'Client Data Management'
  }
};
