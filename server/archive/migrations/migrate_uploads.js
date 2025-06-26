/**
 * Script de migration des fichiers téléversés vers la nouvelle structure de dossiers
 * - Ancienne structure : /uploads/[nom-prenom]/[date]-[fichier].ext
 * - Nouvelle structure : /uploads/[première lettre]/[nom-prenom]/[date]/[fichier]-[timestamp].ext
 */

const fs = require('fs');
const path = require('path');
const db = require('./models/db');

// Chemin de base pour les uploads
const uploadsDir = path.join(__dirname, 'uploads');

// Fonction pour normaliser le nom de dossier
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9-]/g, '-');
}

// Vérifier si le dossier uploads existe
if (!fs.existsSync(uploadsDir)) {
  console.log('Le dossier uploads n\'existe pas encore. Aucune migration nécessaire.');
  process.exit(0);
}

// Récupérer tous les utilisateurs avec leurs documents
db.all(
  `SELECT users.id, users.nom, users.prenom, documents.id AS doc_id, documents.filename, documents.filepath, documents.uploaded_at
   FROM users
   LEFT JOIN documents ON documents.user_id = users.id
   WHERE documents.id IS NOT NULL`,
  (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des données :', err.message);
      process.exit(1);
    }

    if (rows.length === 0) {
      console.log('Aucun document trouvé pour migration.');
      process.exit(0);
    }

    console.log(`Migration de ${rows.length} documents...`);

    // Migrer chaque document
    rows.forEach(row => {
      try {
        const oldPath = row.filepath;
        const uploadDate = new Date(row.uploaded_at).toISOString().split('T')[0];
        
        // Si le chemin est déjà relatif, le convertir en chemin absolu
        const absoluteOldPath = path.isAbsolute(oldPath) 
          ? oldPath 
          : path.join(__dirname, oldPath);
          
        // Vérifier si le fichier existe
        if (!fs.existsSync(absoluteOldPath)) {
          console.error(`Fichier non trouvé : ${absoluteOldPath}`);
          return;
        }

        // Créer le nouveau chemin
        const premiereLettre = row.nom.charAt(0).toLowerCase();
        const nomPrenom = normalizeName(`${row.nom}-${row.prenom}`);
        const timestamp = new Date().getTime();
        const extension = path.extname(row.filename);
        const basename = path.basename(row.filename, extension);
        
        // Structure: /uploads/[première lettre]/[nom-prenom]/[date]/[fichier]-[timestamp].ext
        const newDirPath = path.join(
          uploadsDir,
          premiereLettre,
          nomPrenom,
          uploadDate
        );
        
        // Créer le dossier s'il n'existe pas
        fs.mkdirSync(newDirPath, { recursive: true });
        
        // Nouveau nom de fichier
        const newFileName = `${basename}-${timestamp}${extension}`;
        const newPath = path.join(newDirPath, newFileName);
        const relativeNewPath = path.relative(__dirname, newPath);
        
        // Copier le fichier
        fs.copyFileSync(absoluteOldPath, newPath);
        console.log(`Fichier migré : ${path.basename(absoluteOldPath)} -> ${relativeNewPath}`);
        
        // Mettre à jour la base de données avec le nouveau chemin
        db.run(
          `UPDATE documents SET filepath = ? WHERE id = ?`,
          [relativeNewPath, row.doc_id],
          (err) => {
            if (err) {
              console.error(`Erreur de mise à jour BD pour document ID ${row.doc_id} :`, err.message);
            } else {
              // Après la mise à jour réussie de la BD, supprimer l'ancien fichier
              try {
                fs.unlinkSync(absoluteOldPath);
                console.log(`Ancien fichier supprimé : ${absoluteOldPath}`);
              } catch (delErr) {
                console.error(`Erreur lors de la suppression de l'ancien fichier ${absoluteOldPath} :`, delErr.message);
              }
            }
          }
        );
      } catch (err) {
        console.error(`Erreur lors de la migration du document ${row.doc_id} :`, err.message);
      }
    });
    
    console.log('Migration terminée. Vérifiez les nouveaux dossiers et supprimez les anciens dossiers vides si nécessaire.');
  }
);
