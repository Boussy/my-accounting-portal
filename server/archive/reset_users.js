// Script pour supprimer tous les utilisateurs existants et implémenter une politique de mot de passe forte
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔄 Mise à jour de la base de données et politique de sécurité...');

// Vérifier que le serveur n'est pas en cours d'exécution
try {
  console.log('⚠️ Vérification que le serveur n'est pas en cours d'exécution...');
  // Arrêter le serveur si nécessaire (sur le port 3000)
  const { execSync } = require('child_process');
  try {
    execSync('lsof -ti:3000 | xargs kill -9');
    console.log('✅ Serveur arrêté avec succès.');
  } catch (e) {
    console.log('✅ Aucun serveur en cours d'exécution sur le port 3000.');
  }
} catch (e) {
  console.log('⚠️ Erreur lors de la vérification du serveur. Le script continue.');
}

// Chemin vers la base de données
const dbPath = path.resolve(__dirname, './database.db');

// Vérifier si la base de données existe
if (fs.existsSync(dbPath)) {
  console.log(`🔍 Base de données trouvée: ${dbPath}`);
  
  // Faire une sauvegarde de la base de données
  const backupPath = path.resolve(__dirname, './database.bak.db');
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Sauvegarde de la base de données créée: ${backupPath}`);
  } catch (e) {
    console.error('❌ Erreur lors de la sauvegarde de la base de données:', e.message);
    process.exit(1);
  }
  
  // Supprimer la base de données existante
  try {
    fs.unlinkSync(dbPath);
    console.log('✅ Base de données existante supprimée');
  } catch (e) {
    console.error('❌ Erreur lors de la suppression de la base de données:', e.message);
    process.exit(1);
  }
}

// Créer une nouvelle base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur lors de la création de la base de données:', err.message);
    process.exit(1);
  }
  console.log('📦 Nouvelle base de données SQLite créée');
});

// Activer les clés étrangères
db.run('PRAGMA foreign_keys = ON', (err) => {
  if (err) {
    console.error('❌ Erreur lors de l\'activation des clés étrangères:', err.message);
    process.exit(1);
  }
  console.log('✅ Clés étrangères activées');
});

// Créer la table des utilisateurs avec la structure améliorée
db.run(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('client', 'professionnel')) NOT NULL,
    password_reset_token TEXT,
    password_reset_expires DATETIME,
    password_last_changed DATETIME DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login DATETIME,
    account_locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('❌ Erreur lors de la création de la table users:', err.message);
    process.exit(1);
  }
  console.log('✅ Table users créée avec des champs de sécurité supplémentaires');
  
  // Recréer la table documents également
  db.run(`
    CREATE TABLE documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de la table documents:', err.message);
      process.exit(1);
    }
    console.log('✅ Table documents recréée avec succès');
    
    // Fermer la connexion à la base de données
    db.close((err) => {
      if (err) {
        console.error('❌ Erreur lors de la fermeture de la base de données:', err.message);
        process.exit(1);
      }
      console.log('📦 Connexion à la base SQLite fermée');
      console.log('🔐 La base de données a été réinitialisée. Tous les utilisateurs ont été supprimés.');
      console.log('👉 Utilisez la page d\'inscription pour créer de nouveaux utilisateurs avec des mots de passe sécurisés.');
    });
  });
});
});
