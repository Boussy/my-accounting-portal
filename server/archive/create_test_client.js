// Script pour créer un utilisateur client de test
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Se connecter à la base de données
const db = new sqlite3.Database(path.resolve(__dirname, './database.db'), (err) => {
  if (err) return console.error('Erreur base :', err.message);
  console.log('📦 Connecté à la base SQLite');
});

// Créer un nouvel utilisateur client
const email = 'testclient@example.com';
const password = 'TestClient123!';
const role = 'client';

// Hasher le mot de passe
const hashedPassword = bcrypt.hashSync(password, 10);

// Insérer l'utilisateur
const query = `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`;

db.run(query, [email, hashedPassword, role], function(err) {
  if (err) {
    console.error('❌ Erreur lors de la création de l\'utilisateur:', err.message);
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('Cet utilisateur existe déjà. Mise à jour du mot de passe...');
      
      const updateQuery = `UPDATE users SET password = ? WHERE email = ?`;
      db.run(updateQuery, [hashedPassword, email], function(updateErr) {
        if (updateErr) {
          console.error('❌ Erreur lors de la mise à jour du mot de passe:', updateErr.message);
        } else {
          console.log('✅ Mot de passe mis à jour pour l\'utilisateur:', email);
        }
        closeDB();
      });
    } else {
      closeDB();
    }
  } else {
    console.log(`✅ Utilisateur créé avec succès: Email=${email}, Rôle=${role}, ID=${this.lastID}`);
    console.log(`📝 Informations de connexion:`);
    console.log(`Email: ${email}`);
    console.log(`Mot de passe: ${password}`);
    console.log(`Rôle: ${role}`);
    closeDB();
  }
});

// Fonction pour fermer la base de données
function closeDB() {
  db.close((err) => {
    if (err) console.error('Erreur lors de la fermeture de la base de données:', err.message);
    else console.log('📦 Connexion à la base SQLite fermée');
  });
}
