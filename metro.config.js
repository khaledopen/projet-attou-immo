const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Démarrage automatique du tunnel localtunnel pour le backend
const { spawn } = require('child_process');
const path = require('path');

console.log('[Metro Config] Démarrage du tunnel de l\'API en arrière-plan...');
spawn('node', [path.join(__dirname, '../start-tunnel.js')], {
  stdio: 'inherit',
  shell: true
});

module.exports = config;
