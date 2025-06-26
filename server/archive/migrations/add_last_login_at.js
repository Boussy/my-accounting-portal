/**
 * Migration pour ajouter la colonne last_login_at à la table users
 */
const db = require('../models/db');

function addLastLoginColumn() {
  return new Promise((resolve, reject) => {
    // Vérifier si la colonne existe déjà
    db.get("PRAGMA table_info(users)", [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      
      // Vérifier si la colonne last_login_at existe déjà
      const columnExists = rows.some(row => row.name === 'last_login_at');
      
      if (!columnExists) {
        console.log('Ajout de la colonne last_login_at à la table users...');
        db.run(`ALTER TABLE users ADD COLUMN last_login_at DATETIME`, (err) => {
          if (err) {
            return reject(err);
          }
          console.log('✅ Colonne last_login_at ajoutée avec succès!');
          resolve();
        });
      } else {
        console.log('La colonne last_login_at existe déjà.');
        resolve();
      }
    });
  });
}

// Exécuter la migration
addLastLoginColumn()
  .then(() => {
    console.log('Migration terminée avec succès!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erreur lors de la migration:', err);
    process.exit(1);
  });
