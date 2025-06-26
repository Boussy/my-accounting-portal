/**
 * Script pour nettoyer les anciens dossiers d'upload après migration
 * - Supprime les dossiers vides dans /uploads/ qui suivent l'ancienne structure
 */

const fs = require('fs');
const path = require('path');

// Chemin de base pour les uploads
const uploadsDir = path.join(__dirname, 'uploads');

console.log('Début du nettoyage des anciens dossiers...');

// Fonction pour supprimer les dossiers vides récursivement
function removeEmptyDirectories(dir) {
  // Ne pas toucher aux dossiers qui correspondent à la nouvelle structure (lettre unique)
  if (dir === uploadsDir) {
    // Traiter chaque sous-dossier du dossier uploads
    const entries = fs.readdirSync(dir);
    
    // Filtrer les entrées pour ne pas toucher aux dossiers de lettres (nouvelle structure)
    const foldersToCheck = entries.filter(entry => {
      const fullPath = path.join(dir, entry);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      // Exclure les dossiers à une seule lettre (nouvelle structure)
      return isDirectory && !(entry.length === 1 && /^[a-z]$/.test(entry));
    });
    
    // Traiter les dossiers de l'ancienne structure
    foldersToCheck.forEach(entry => {
      const fullPath = path.join(dir, entry);
      removeEmptyDirectories(fullPath);
    });
    
    return;
  }
  
  // Pour les sous-dossiers, vérifier s'ils sont vides
  let entries = fs.readdirSync(dir);
  
  if (entries.length > 0) {
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        removeEmptyDirectories(fullPath);
      }
    });
    
    // Vérifier à nouveau après avoir traité les sous-dossiers
    entries = fs.readdirSync(dir);
  }
  
  // Si le dossier est vide, le supprimer
  if (entries.length === 0 && dir !== uploadsDir) {
    console.log(`Suppression du dossier vide : ${dir}`);
    fs.rmdirSync(dir);
  }
}

// Exécuter le nettoyage
try {
  if (fs.existsSync(uploadsDir)) {
    removeEmptyDirectories(uploadsDir);
    console.log('Nettoyage terminé avec succès.');
  } else {
    console.log('Le dossier uploads n\'existe pas.');
  }
} catch (err) {
  console.error('Erreur lors du nettoyage :', err.message);
}
