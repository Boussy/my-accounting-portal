const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../database.db'), (err) => {
  if (err) return console.error('Erreur base :', err.message);
});

// Vérifier si la table users existe
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`, (err, table) => {
  if (err) {
    console.error('Erreur lors de la vérification de la table users:', err.message);
    return;
  }
  
  if (table) {
    // Vérifier la contrainte CHECK
    db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`, (err, row) => {
      if (err) {
        console.error('Erreur lors de la récupération de la structure:', err.message);
        return;
      }
      
      const tableSql = row.sql;
      if (tableSql.includes("'client', 'comptable'")) {
        
        // Créer une table temporaire avec la bonne contrainte
        db.run(`
          CREATE TABLE users_temp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT CHECK(role IN ('client', 'professionnel')) NOT NULL
          )
        `, (err) => {
          if (err) {
            console.error('Erreur lors de la création de la table temporaire:', err.message);
            return;
          }
          
          // Copier les données
          db.run(`INSERT INTO users_temp SELECT id, email, password, 
            CASE WHEN role = 'comptable' THEN 'professionnel' ELSE role END 
            FROM users`, (err) => {
            if (err) {
              console.error('Erreur lors de la copie des données:', err.message);
              return;
            }
            
            // Supprimer l'ancienne table
            db.run(`DROP TABLE users`, (err) => {
              if (err) {
                console.error('Erreur lors de la suppression de la table users:', err.message);
                return;
              }
              
              // Renommer la table temporaire
              db.run(`ALTER TABLE users_temp RENAME TO users`, (err) => {
                if (err) {
                  console.error('Erreur lors du renommage de la table:', err.message);
                  return;
                }
                
              });
            });
          });
        });
      }
    });
  } else {
    // Créer la table users si elle n'existe pas
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT CHECK(role IN ('client', 'professionnel')) NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table users:', err.message);
      }
    });
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

module.exports = db;
