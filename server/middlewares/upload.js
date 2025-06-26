const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../models/db');

// Création du dossier dynamiquement : /uploads/[nom-prenom]/[date]/
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // Si l'utilisateur n'est pas authentifié, utiliser le dossier temp
      if (!req.user || !req.user.id) {
        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        return cb(null, tempDir);
      }
      
      // Récupérer les infos utilisateur depuis la base de données
      // Utiliser une promesse pour gérer la requête asynchrone
      const getUserInfo = () => {
        return new Promise((resolve, reject) => {
          db.get('SELECT nom, prenom FROM users WHERE id = ?', [req.user.id], (err, user) => {
            if (err) reject(err);
            else resolve(user);
          });
        });
      };
      
      try {
        const user = await getUserInfo();
        
        if (!user || !user.nom || !user.prenom) {
          console.error('Infos utilisateur introuvables');
          const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
          fs.mkdirSync(tempDir, { recursive: true });
          return cb(null, tempDir);
        }
        
        // Formater le nom et prénom pour le dossier (sans espaces, en minuscules)
        const nomPrenom = `${user.nom}-${user.prenom}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
          .replace(/[^a-z0-9-]/g, '-');
        
        // Créer le dossier avec classement alphabétique
        // Format: /uploads/a/albert-dupont/
        const premiereLettre = user.nom.charAt(0).toLowerCase();
        
        // Créer le dossier par date au format YYYY-MM-DD
        const date = new Date();
        const datePart = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Créer le chemin du dossier complet avec structure hiérarchique
        const dir = path.join(
          __dirname, 
          '..', 
          'uploads', 
          premiereLettre, 
          nomPrenom,
          datePart
        );
        
        // Créer le dossier s'il n'existe pas
        fs.mkdirSync(dir, { recursive: true });
        
        cb(null, dir);
      } catch (error) {
        console.error('Erreur lors de la récupération des infos utilisateur:', error);
        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        cb(null, tempDir);
      }
    } catch (globalError) {
      console.error('Erreur globale dans le middleware upload:', globalError);
      const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    }
  },
  filename: function (req, file, cb) {
    try {
      // Extraire l'extension du fichier
      const extension = path.extname(file.originalname);
      const basename = path.basename(file.originalname, extension);
      
      // Ajouter timestamp pour éviter les conflits de noms
      const timestamp = new Date().getTime();
      
      cb(null, `${basename}-${timestamp}${extension}`);
    } catch (error) {
      console.error('Erreur lors de la génération du nom de fichier:', error);
      cb(error);
    }
  }
});

// Configuration multer
const fileFilter = function (req, file, cb) {
  // Vérification des types de fichiers acceptés
  const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  
  // Vérification de la taille du fichier (limitée à 10 MB dans les limites mais vérifié ici pour message personnalisé)
  const maxSize = 10 * 1024 * 1024; // 10 MB
  
  if (!extname || !mimetype) {
    return cb(new Error('Format de fichier non autorisé! Seuls les images, PDF et documents Office sont acceptés.'));
  } else {
    return cb(null, true);
  }
};

const limits = {
  fileSize: 10 * 1024 * 1024 // 10 MB maximum
};

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
