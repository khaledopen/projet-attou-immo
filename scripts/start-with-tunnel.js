const { spawn } = require('child_process');
const path = require('path');

console.log('[App Startup] Démarrage automatique du tunnel de l\'API backend...');

// Lance le script start-tunnel.js situé à la racine du projet
const tunnel = spawn('node', [path.join(__dirname, '../../start-tunnel.js')], {
  stdio: 'inherit',
  shell: true
});

// Attendre 4 secondes pour que localtunnel obtienne l'URL publique et mette à jour le fichier .env
setTimeout(() => {
  console.log('[App Startup] Démarrage d\'Expo Go...');
  
  // Transfère tous les arguments additionnels (comme --clear, --android, --ios)
  const expoArgs = process.argv.slice(2);
  const expo = spawn('npx', ['expo', 'start', ...expoArgs], {
    stdio: 'inherit',
    shell: true
  });

  expo.on('close', (code) => {
    // Tue le tunnel si le serveur Expo s'arrête
    tunnel.kill();
    process.exit(code);
  });
}, 4000);
