const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

require('dotenv').config();
require('./models/db'); // Initialise la base de données SQLite

const authRoutes = require('./routes/auth');
const docRoutes = require('./routes/documents');

const app = express();
// Configuration avancée de CORS pour éviter les problèmes de requêtes cross-origin
app.use(cors({
  origin: '*', // Permettre toutes les origines en développement
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// Dossier public pour les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/docs', docRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
