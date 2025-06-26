const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../database.db'), (err) => {
  if (err) return console.error('Erreur base :', err.message);
});

// Vérifier si la table documents existe
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='documents'`, (err, table) => {
  if (err) {
    console.error('Erreur lors de la vérification de la table documents:', err.message);
    return;
  }
  
  if (table) {
    // Vérifier si la colonne status existe
    db.all(`PRAGMA table_info(documents)`, (err, columns) => {
      if (err) {
        console.error('Erreur lors de la récupération des colonnes de la table documents:', err.message);
        return;
      }
      
      const hasStatus = columns.some(col => col.name === 'status');
      
      if (!hasStatus) {
        // Ajouter la colonne status si elle n'existe pas
        db.run(`ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'pending'`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne status:', err.message);
          } else {
            console.log('Colonne status ajoutée à la table documents');
          }
        });
      }
    });
  } else {
    // Créer la table documents si elle n'existe pas
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table documents:', err.message);
      } else {
        console.log('Table documents créée');
      }
    });
  }
});

// Vérifier si la table users existe
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`, (err, table) => {
  if (err) {
    console.error('Erreur lors de la vérification de la table users:', err.message);
    return;
  }
  
  if (table) {
    // Vérifier si les colonnes nécessaires existent
    db.all(`PRAGMA table_info(users)`, (err, columns) => {
      if (err) {
        console.error('Erreur lors de la récupération des colonnes:', err.message);
        return;
      }
      
      const hasFirstName = columns.some(col => col.name === 'prenom');
      const hasLastName = columns.some(col => col.name === 'nom');
      const hasEntreprise = columns.some(col => col.name === 'entreprise');
      const hasAdresse = columns.some(col => col.name === 'adresse');
      const hasNumero = columns.some(col => col.name === 'numero');
      const hasRgpd = columns.some(col => col.name === 'rgpd_accepted');
      const hasCgu = columns.some(col => col.name === 'cgu_accepted');
      
      // Ajouter les colonnes si elles n'existent pas
      if (!hasFirstName) {
        db.run(`ALTER TABLE users ADD COLUMN prenom TEXT`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne prenom:', err.message);
          }
        });
      }
      
      if (!hasLastName) {
        db.run(`ALTER TABLE users ADD COLUMN nom TEXT`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne nom:', err.message);
          }
        });
      }

      if (!hasEntreprise) {
        db.run(`ALTER TABLE users ADD COLUMN entreprise TEXT`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne entreprise:', err.message);
          }
        });
      }

      if (!hasAdresse) {
        db.run(`ALTER TABLE users ADD COLUMN adresse TEXT`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne adresse:', err.message);
          }
        });
      }

      if (!hasNumero) {
        db.run(`ALTER TABLE users ADD COLUMN numero TEXT`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne numero:', err.message);
          }
        });
      }

      if (!hasRgpd) {
        db.run(`ALTER TABLE users ADD COLUMN rgpd_accepted BOOLEAN DEFAULT 0`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne rgpd_accepted:', err.message);
          }
        });
      }

      if (!hasCgu) {
        db.run(`ALTER TABLE users ADD COLUMN cgu_accepted BOOLEAN DEFAULT 0`, (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout de la colonne cgu_accepted:', err.message);
          }
        });
      }
    });

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
            role TEXT CHECK(role IN ('client', 'professionnel')) NOT NULL,
            nom TEXT,
            prenom TEXT,
            entreprise TEXT,
            adresse TEXT,
            numero TEXT,
            rgpd_accepted BOOLEAN DEFAULT 0,
            cgu_accepted BOOLEAN DEFAULT 0
          )
        `, (err) => {
          if (err) {
            console.error('Erreur lors de la création de la table temporaire:', err.message);
            return;
          }
          
          // Copier les données
          db.run(`INSERT INTO users_temp SELECT id, email, password, 
            CASE WHEN role = 'comptable' THEN 'professionnel' ELSE role END,
            nom, prenom, entreprise, adresse, numero, rgpd_accepted, cgu_accepted
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
        role TEXT CHECK(role IN ('client', 'professionnel')) NOT NULL,
        nom TEXT,
        prenom TEXT,
        entreprise TEXT,
        adresse TEXT,
        numero TEXT,
        rgpd_accepted BOOLEAN DEFAULT 0,
        cgu_accepted BOOLEAN DEFAULT 0
      )
    `, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table users:', err.message);
      }
    });
  }
});

// Mettre à jour la structure de la table documents pour inclure le chemin relatif du fichier
db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    filepath TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

module.exports = db;
