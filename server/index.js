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

// Middleware pour gérer les fichiers non trouvés (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Middleware global pour la gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur non interceptée:', err);
  const status = err.status || 500;
  const message = err.message || 'Erreur serveur interne';
  
  // Envoyer des détails d'erreur en environnement de développement uniquement
  const errorDetails = process.env.NODE_ENV === 'development' ? { stack: err.stack } : {};
  
  res.status(status).json({ 
    message, 
    ...errorDetails
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
