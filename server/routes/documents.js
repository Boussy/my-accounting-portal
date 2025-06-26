const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const verifyToken = require('../middlewares/verifyToken');
const { uploadDoc, getDocsByUser, getAllDocs, filterDocuments } = require('../controllers/docController');
const db = require('../models/db');
const path = require('path');
const fs = require('fs');

// 📤 Route pour téléverser un document (client connecté)
router.post('/upload', verifyToken, upload.single('file'), uploadDoc);

// 📄 Route pour récupérer ses propres documents (client connecté)
router.get('/mydocs', verifyToken, getDocsByUser);

// 📚 Route pour les comptables : voir tous les documents
router.get('/all', verifyToken, getAllDocs);

// 🔍 Route pour filtrer les documents selon plusieurs critères
router.get('/filter', verifyToken, filterDocuments);

// 👁️ Route pour prévisualiser un document
router.get('/preview/:id', verifyToken, (req, res) => {
  const docId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Requête pour vérifier les droits d'accès au document
  const query = userRole === 'professionnel' 
    ? `SELECT filepath, filename FROM documents WHERE id = ?` // Pour les comptables : tous les documents
    : `SELECT filepath, filename FROM documents WHERE id = ? AND user_id = ?`; // Pour les clients : seulement leurs documents
  
  const params = userRole === 'professionnel' ? [docId] : [docId, userId];
  
  db.get(query, params, (err, doc) => {
    if (err) {
      console.error('Erreur lors de la récupération du document :', err.message);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
    
    if (!doc) {
      return res.status(404).json({ message: 'Document non trouvé ou accès non autorisé.' });
    }
    
    // Construire le chemin complet du fichier
    const filePath = path.resolve(__dirname, '..', doc.filepath);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé sur le serveur.' });
    }

    // Vérifier le type de fichier pour décider comment le prévisualiser
    const fileExtension = path.extname(doc.filename).toLowerCase();
    
    // Pour les images, PDF et certains types de fichiers, on peut les afficher directement
    const previewableExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    
    // Définir le type MIME correctement pour les différents types de fichiers
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    // Configurer les en-têtes pour permettre la prévisualisation
    res.setHeader('Content-Type', mimeTypes[fileExtension] || 'application/octet-stream');
    res.setHeader('Content-Disposition', req.query.download ? 
      `attachment; filename="${encodeURIComponent(doc.filename)}"` : 
      `inline; filename="${encodeURIComponent(doc.filename)}"`);
    
    // Ajouter des en-têtes pour l'accès cross-origin pour le cas où le frontend est sur un domaine différent
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    if (previewableExtensions.includes(fileExtension)) {
      // Lire et envoyer directement le fichier pour assurer un meilleur contrôle des en-têtes
      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.error('Erreur lors de la lecture du fichier:', err);
          return res.status(500).json({ message: 'Erreur lors de la lecture du fichier.' });
        }
        res.end(data);
      });
    } else {
      // Pour les autres types de fichiers, proposer le téléchargement
      res.download(filePath, doc.filename);
    }
  });
});

// 🔽 Route pour télécharger un document
router.get('/download/:id', verifyToken, (req, res) => {
  const docId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Requête pour vérifier les droits d'accès au document
  const query = userRole === 'professionnel' 
    ? `SELECT filepath, filename FROM documents WHERE id = ?` // Pour les comptables : tous les documents
    : `SELECT filepath, filename FROM documents WHERE id = ? AND user_id = ?`; // Pour les clients : seulement leurs documents
  
  const params = userRole === 'professionnel' ? [docId] : [docId, userId];
  
  db.get(query, params, (err, doc) => {
    if (err) {
      console.error('Erreur lors de la récupération du document :', err.message);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
    
    if (!doc) {
      return res.status(404).json({ message: 'Document non trouvé ou accès non autorisé.' });
    }
    
    // Construire le chemin complet du fichier
    const filePath = path.resolve(__dirname, '..', doc.filepath);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé sur le serveur.' });
    }

    // Définir le type MIME en fonction de l'extension du fichier
    const fileExtension = path.extname(doc.filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain'
    };
    
    // Configuration des en-têtes pour forcer le téléchargement
    res.setHeader('Content-Type', mimeTypes[fileExtension] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // Lire et envoyer le fichier
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        console.error('Erreur lors de la lecture du fichier:', readErr);
        return res.status(500).json({ message: 'Erreur lors de la lecture du fichier.' });
      }
      
      // Enregistrer le téléchargement dans les logs
      console.log(`Document ${doc.filename} (ID: ${docId}) téléchargé par l'utilisateur ${userId}`);
      
      // Envoyer le fichier
      res.end(data);
    });
  });
});

// 📄 Route pour récupérer les métadonnées d'un document
router.get('/:id', verifyToken, (req, res) => {
  const docId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Construire la requête selon le rôle de l'utilisateur
  const query = userRole === 'professionnel' 
    ? `SELECT d.*, u.nom, u.prenom, u.email FROM documents d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.id = ?`
    : `SELECT d.* FROM documents d 
       WHERE d.id = ? AND d.user_id = ?`;
  
  const params = userRole === 'professionnel' ? [docId] : [docId, userId];
  
  db.get(query, params, (err, doc) => {
    if (err) {
      console.error('Erreur lors de la récupération des métadonnées du document :', err.message);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
    
    if (!doc) {
      return res.status(404).json({ message: 'Document non trouvé ou accès non autorisé.' });
    }
    
    return res.status(200).json(doc);
  });
});

// Ce bloc a été supprimé car c'était un doublon de la route '/:id' déjà définie

// 📋 Route pour obtenir les formats de fichiers supportés pour la prévisualisation
router.get('/supported-formats', verifyToken, (req, res) => {
  // Liste des formats supportés pour la prévisualisation directe
  const supportedFormats = {
    preview: ['pdf', 'jpg', 'jpeg', 'png', 'gif'],
    download: ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv']
  };
  
  res.status(200).json({
    message: 'Liste des formats supportés',
    formats: [...supportedFormats.preview, ...supportedFormats.download],
    previewFormats: supportedFormats.preview,
    downloadFormats: supportedFormats.download
  });
});

// ✅ Route pour mettre à jour le statut d'un document
router.put('/status/:id', verifyToken, (req, res) => {
  const docId = req.params.id;
  const { status, sendNotification = true } = req.body;
  const userRole = req.user.role;
  
  // Vérifier que l'utilisateur est un professionnel
  if (userRole !== 'professionnel') {
    return res.status(403).json({ message: 'Accès refusé. Seuls les professionnels peuvent mettre à jour le statut des documents.' });
  }
  
  // Vérifier que le statut est valide
  const validStatuses = ['pending', 'processing', 'validated', 'urgent'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Statut non valide.' });
  }
  
  // Mettre à jour le statut en base de données
  db.run(
    `UPDATE documents SET status = ? WHERE id = ?`,
    [status, docId],
    async function (err) {
      if (err) {
        console.error('Erreur lors de la mise à jour du statut :', err.message);
        return res.status(500).json({ message: 'Erreur serveur.' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Document non trouvé.' });
      }
      
      // Envoyer une notification par email si demandé
      if (sendNotification) {
        try {
          const notificationService = require('../services/notificationService');
          await notificationService.notifyDocumentStatusChange(docId, status);
        } catch (notifError) {
          console.error('Erreur lors de l\'envoi de la notification:', notifError);
          // On continue malgré l'erreur de notification
        }
      }
      
      return res.status(200).json({
        message: 'Statut mis à jour avec succès.',
        documentId: docId,
        newStatus: status,
        notificationSent: sendNotification
      });
    }
  );
});

module.exports = router;
