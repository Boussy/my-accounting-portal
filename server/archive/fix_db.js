// Ce script corrige le problème de la contrainte CHECK dans la table users
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Se connecter à la base de données
const db = new sqlite3.Database(path.resolve(__dirname, './database.db'), (err) => {
  if (err) return console.error('Erreur base :', err.message);
  console.log('📦 Connecté à la base SQLite');
});

// Mettre la base de données en mode série (pour éviter les erreurs de concurrence)
db.serialize(() => {
  // 1. Créer une nouvelle table avec la contrainte CHECK correcte
  db.run(`
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('client', 'professionnel')) NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Erreur lors de la création de la nouvelle table:', err.message);
      return;
    }
    console.log('✅ Nouvelle table users_new créée avec succès');
    
    // 2. Copier les données de l'ancienne table vers la nouvelle
    db.all(`SELECT * FROM users`, [], (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des utilisateurs:', err.message);
        return;
      }
      
      console.log(`📋 ${rows.length} utilisateurs trouvés à migrer`);
      
      // Préparer la requête d'insertion
      const stmt = db.prepare(`INSERT INTO users_new (id, email, password, role) VALUES (?, ?, ?, ?)`);
      
      // Insérer chaque ligne dans la nouvelle table
      // Si role='comptable', le modifier en 'professionnel'
      rows.forEach(row => {
        const roleValue = row.role === 'comptable' ? 'professionnel' : row.role;
        stmt.run(row.id, row.email, row.password, roleValue, function(err) {
          if (err) {
            console.error(`Erreur lors de l'insertion de l'utilisateur ${row.email}:`, err.message);
          } else {
            console.log(`✅ Utilisateur ${row.email} migré avec succès (rôle: ${roleValue})`);
          }
        });
      });
      
      stmt.finalize();
      
      // 3. Supprimer l'ancienne table et renommer la nouvelle
      db.run(`DROP TABLE users`, (err) => {
        if (err) {
          console.error('Erreur lors de la suppression de l\'ancienne table:', err.message);
          return;
        }
        
        db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
          if (err) {
            console.error('Erreur lors du renommage de la table:', err.message);
            return;
          }
          
          console.log('✅ Migration complétée avec succès !');
          
          // Afficher la liste des utilisateurs après la migration
          db.all(`SELECT id, email, role FROM users`, [], (err, rows) => {
            if (err) {
              console.error('Erreur lors de la vérification des utilisateurs:', err.message);
              return;
            }
            
            console.log('📋 Liste des utilisateurs après migration:');
            rows.forEach(row => {
              console.log(`ID: ${row.id}, Email: ${row.email}, Rôle: ${row.role}`);
            });
            
            // Fermer la connexion à la base de données
            db.close((err) => {
              if (err) {
                console.error('Erreur lors de la fermeture de la base de données:', err.message);
                return;
              }
              console.log('📦 Connexion à la base SQLite fermée');
            });
          });
        });
      });
    });
  });
});
