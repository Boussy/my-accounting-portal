#!/bin/bash
# Script pour réinitialiser la base de données et supprimer tous les utilisateurs

echo "🔄 Réinitialisation de la base de données et suppression de tous les utilisateurs..."

# Chemin vers la base de données
DB_PATH="./database.db"
BACKUP_PATH="./database.bak.$(date +%Y%m%d%H%M%S).db"

# Arrêter le serveur si nécessaire
if lsof -i:3000 > /dev/null; then
  echo "⚠️ Arrêt du serveur en cours d'exécution..."
  kill $(lsof -t -i:3000) 2>/dev/null
  sleep 2
fi

# Faire une sauvegarde de la base de données
if [ -f "$DB_PATH" ]; then
  echo "📦 Sauvegarde de la base de données existante..."
  cp "$DB_PATH" "$BACKUP_PATH"
  echo "✅ Sauvegarde créée: $BACKUP_PATH"
  
  # Supprimer la base de données existante
  rm "$DB_PATH"
  echo "✅ Base de données supprimée"
fi

# Initialiser une nouvelle base de données avec SQLite
echo "📦 Création d'une nouvelle base de données..."
sqlite3 "$DB_PATH" << 'SQL'
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
);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
SQL

echo "🔐 Base de données réinitialisée avec succès. Tous les utilisateurs ont été supprimés."
echo "👉 Utilisez la page d'inscription pour créer de nouveaux utilisateurs avec des mots de passe sécurisés."
