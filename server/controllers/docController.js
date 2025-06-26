const db = require('../models/db');
const path = require('path');
const fs = require('fs');

// 📤 Enregistrer le document uploadé
exports.uploadDoc = (req, res) => {
  // Vérifier que req.user existe
  if (!req.user || !req.user.id) {
    console.error('Erreur : req.user ou req.user.id manquant');
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }
  
  const userId = req.user.id;
  const file = req.file;

  // Vérifier que le fichier existe
  if (!file) {
    console.error('Erreur : Aucun fichier reçu');
    return res.status(400).json({ message: 'Aucun fichier reçu.' });
  }

  const originalName = file.originalname;
  const filePath = file.path;
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const uploadDate = new Date().toISOString();
  const status = 'pending'; // Statut initial : En attente

  // Récupérer les informations du client pour le log
  db.get(
    `SELECT nom, prenom FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        console.error('Erreur lors de la récupération du client:', err.message);
      } else if (user) {
        console.log(`Fichier téléversé par ${user.prenom} ${user.nom} (ID: ${userId}) : ${originalName}`);
      }
    }
  );

  db.run(
    `INSERT INTO documents (user_id, filename, filepath, uploaded_at, status)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, originalName, relativePath, uploadDate, status],
    function (err) {
      if (err) {
        console.error('Erreur lors de l\'enregistrement du fichier :', err.message);
        // Message plus détaillé pour aider au débogage
        return res.status(500).json({ 
          message: 'Erreur lors de l\'enregistrement du document dans la base de données.', 
          errorDetails: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      return res.status(201).json({
        message: 'Fichier uploadé avec succès.',
        documentId: this.lastID,
        filePath: relativePath,
        status: status
      });
    }
  );
};

// 📂 Récupérer les fichiers du client connecté
exports.getDocsByUser = (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT id, filename, filepath, uploaded_at, status FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des documents :', err.message);
        return res.status(500).json({ message: 'Erreur serveur.' });
      }
      
      // Organiser par date
      const organizedByDate = rows.reduce((acc, doc) => {
        const uploadDate = new Date(doc.uploaded_at).toISOString().split('T')[0];
        
        if (!acc[uploadDate]) {
          acc[uploadDate] = [];
        }
        
        // Ajouter le chemin complet du fichier
        const fullPath = path.join(__dirname, '..', doc.filepath);
        doc.fullPath = fullPath;
        
        acc[uploadDate].push(doc);
        return acc;
      }, {});
      
      res.status(200).json({
        byDate: organizedByDate,
        allDocs: rows
      });
    }
  );
};

// 📚 Récupérer tous les fichiers (pour les comptables)
exports.getAllDocs = (req, res) => {
  const userRole = req.user.role;

  if (userRole !== 'professionnel') {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  db.all(
    `SELECT documents.id, documents.filename, documents.filepath, documents.uploaded_at, documents.status,
            users.email AS client_email, users.nom, users.prenom, users.id AS userId
     FROM documents
     JOIN users ON documents.user_id = users.id
     ORDER BY users.nom, users.prenom, documents.uploaded_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des documents :', err.message);
        return res.status(500).json({ message: 'Erreur serveur.' });
      }

      // Organiser les résultats par ordre alphabétique de client et par date
      const organizedDocs = rows.reduce((acc, doc) => {
        const clientName = `${doc.nom || ''} ${doc.prenom || ''}`.trim() || doc.client_email;
        const uploadDate = new Date(doc.uploaded_at).toISOString().split('T')[0];
        
        if (!acc[clientName]) {
          acc[clientName] = {};
        }
        
        if (!acc[clientName][uploadDate]) {
          acc[clientName][uploadDate] = [];
        }
        
        // Ajouter le chemin complet du fichier
        const fullPath = path.join(__dirname, '..', doc.filepath);
        doc.fullPath = fullPath;
        
        acc[clientName][uploadDate].push(doc);
        return acc;
      }, {});

      res.status(200).json({
        byClient: organizedDocs,
        allDocs: rows
      });
    }
  );
};

// 🔍 Filtrer les documents selon plusieurs critères
exports.filterDocuments = (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;
  
  // Vérifier les droits d'accès
  if (userRole !== 'professionnel' && userRole !== 'client') {
    return res.status(403).json({ message: 'Accès refusé.' });
  }
  
  // Récupérer les paramètres de filtre
  const { status, type, from, to, client, search } = req.query;
  
  // Construire la requête de base selon le rôle
  let baseQuery = userRole === 'professionnel' 
    ? `SELECT documents.id, documents.filename, documents.uploaded_at, documents.status,
              users.email AS client_email, users.nom, users.prenom
       FROM documents 
       JOIN users ON documents.user_id = users.id` 
    : `SELECT id, filename, uploaded_at, status 
       FROM documents 
       WHERE user_id = ?`;
  
  // Tableau des paramètres pour la requête
  let params = userRole === 'professionnel' ? [] : [userId];
  
  // Ajouter les conditions du filtre
  const conditions = [];
  
  if (userRole === 'professionnel') {
    if (status) {
      conditions.push('documents.status = ?');
      params.push(status);
    }
    
    if (client) {
      conditions.push('(users.email = ? OR (users.nom || " " || users.prenom) LIKE ?)');
      params.push(client, `%${client}%`);
    }
  } else {
    // Pour les clients, ils ne peuvent filtrer que leurs propres documents
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
  }
  
  // Filtre par type de fichier (extension)
  if (type) {
    const extensions = type.split(',').map(ext => ext.trim());
    const placeholders = extensions.map(() => 'LOWER(filename) LIKE ?').join(' OR ');
    conditions.push(`(${placeholders})`);
    extensions.forEach(ext => params.push(`%.${ext.toLowerCase()}`));
  }
  
  // Filtre par date de début
  if (from) {
    conditions.push('DATE(uploaded_at) >= DATE(?)');
    params.push(from);
  }
  
  // Filtre par date de fin
  if (to) {
    conditions.push('DATE(uploaded_at) <= DATE(?)');
    params.push(to);
  }
  
  // Recherche textuelle
  if (search) {
    if (userRole === 'professionnel') {
      conditions.push('(LOWER(documents.filename) LIKE ? OR LOWER(users.email) LIKE ? OR LOWER(users.nom || " " || users.prenom) LIKE ?)');
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    } else {
      conditions.push('LOWER(filename) LIKE ?');
      params.push(`%${search.toLowerCase()}%`);
    }
  }
  
  // Ajouter les conditions à la requête
  if (conditions.length > 0) {
    // Si c'est un client, il y a déjà une condition WHERE
    if (userRole === 'client') {
      baseQuery += ' AND ' + conditions.join(' AND ');
    } else {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
  }
  
  // Ajouter l'ordre
  baseQuery += ' ORDER BY uploaded_at DESC';
  
  // Exécuter la requête
  db.all(baseQuery, params, (err, documents) => {
    if (err) {
      console.error('Erreur lors du filtrage des documents :', err.message);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
    
    // Pour les professionnels, structurer les données par client
    if (userRole === 'professionnel') {
      const byClient = {};
      
      documents.forEach(doc => {
        const clientKey = doc.client_email || `${doc.nom} ${doc.prenom}`;
        
        if (!byClient[clientKey]) {
          byClient[clientKey] = {};
        }
        
        const dateKey = new Date(doc.uploaded_at).toISOString().split('T')[0];
        
        if (!byClient[clientKey][dateKey]) {
          byClient[clientKey][dateKey] = [];
        }
        
        byClient[clientKey][dateKey].push(doc);
      });
      
      return res.status(200).json({
        message: 'Documents filtrés récupérés avec succès.',
        documents,
        byClient
      });
    } else {
      return res.status(200).json({
        message: 'Documents filtrés récupérés avec succès.',
        documents
      });
    }
  });
};
