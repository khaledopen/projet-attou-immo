const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Ajuster pour la production
    methods: ['GET', 'POST'],
  },
});

const prisma = new PrismaClient();

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser toutes les origines en développement pour éviter les blocages CORS (Expo Web, Tunnels, Localhost ports)
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Connexion Socket.io
io.on('connection', (socket) => {
  console.log('[SocketServer] 🟢 Utilisateur connecté:', socket.id, 'depuis l\'origine:', socket.handshake.headers.origin || 'App mobile');

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`[SocketServer] 👥 User ${userId} a rejoint sa room : user_${userId} (Socket ID: ${socket.id})`);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SocketServer] 🔴 Utilisateur déconnecté:', socket.id, 'Raison:', reason);
  });
});

// Middleware pour injecter prisma et io dans les requêtes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.io = io;
  next();
});

// Route de base
app.get('/', (req, res) => {
  res.send('AttouNest API is running...');
});

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Importer et utiliser les routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

const PORT = process.env.PORT || 5000;

// Importer le contrôleur de visites pour la logique d'expiration automatique sous 72h
const { expireVisits } = require('./controllers/visitController');

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Exécuter le contrôle d'expiration immédiatement au démarrage, puis toutes les 60 secondes
  expireVisits(io);
  setInterval(() => {
    expireVisits(io);
  }, 60000);
});
