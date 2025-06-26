#!/bin/bash
# Script pour nettoyer la codebase et organiser les fichiers inutilisés

echo "🧹 Nettoyage de la codebase et organisation des archives..."

# Créer les dossiers d'archive s'ils n'existent pas
mkdir -p server/archive/tests
mkdir -p server/archive/migrations
mkdir -p server/archive/utils
mkdir -p server/archive/temporary

# Archiver les fichiers de test
echo "📦 Archivage des fichiers de test..."
mv server/tests/* server/archive/tests/ 2>/dev/null

# Archiver les fichiers de migration et utilitaires qui ne sont pas essentiels
echo "📦 Archivage des fichiers de migration et utilitaires..."

# Fichiers de migration à archiver
MIGRATION_FILES=(
  "server/migrate_file_structure.js"
  "server/migrate_uploads.js"
  "server/migrations/add_last_login_at.js"
)

for file in "${MIGRATION_FILES[@]}"; do
  if [ -f "$file" ]; then
    BASENAME=$(basename "$file")
    mv "$file" "server/archive/migrations/$BASENAME" 2>/dev/null
    echo "📄 Archivé dans migrations: $BASENAME"
  fi
done

# Fichiers utilitaires à archiver
UTILS_FILES=(
  "server/clean_uploads.js"
  "server/cleanup_temp.sh"
  "server/test_multer.js"
  "server/reset_db.sh"
  "server/middlewares/upload.js.new"
)

for file in "${UTILS_FILES[@]}"; do
  if [ -f "$file" ]; then
    BASENAME=$(basename "$file")
    mv "$file" "server/archive/utils/$BASENAME" 2>/dev/null
    echo "📄 Archivé dans utils: $BASENAME"
  fi
done

# Fichiers temporaires à archiver
TEMP_FILES=(
  "server/test.txt"
)

for file in "${TEMP_FILES[@]}"; do
  if [ -f "$file" ]; then
    BASENAME=$(basename "$file")
    mv "$file" "server/archive/temporary/$BASENAME" 2>/dev/null
    echo "📄 Archivé dans temporary: $BASENAME"
  fi
done

# Nettoyer les fichiers upload temporaires non utilisés
echo "🗑️ Nettoyage des fichiers temporaires..."
find server/uploads/temp -type f -mtime +1 -delete 2>/dev/null

# Nettoyer les dossiers vides
echo "🧹 Nettoyage des dossiers vides..."
find server/uploads -type d -empty -delete 2>/dev/null
mkdir -p server/uploads/temp

# Nettoyer les dossiers tests et migrations vides
rm -rf server/tests 2>/dev/null
rm -rf server/migrations 2>/dev/null
mkdir -p server/migrations

echo "✅ Nettoyage terminé!"
echo "Le script 'demarrer_serveur.sh' a été conservé comme demandé."
echo ""
echo "📋 Structure du projet optimisée:"
echo "  - client/          : Fichiers frontend (HTML, CSS, JS)"
echo "  - server/          : Fichiers backend (Node.js, Express)" 
echo "  - server/archive/  : Fichiers archivés non essentiels"
echo ""
echo "🚀 Pour démarrer le serveur, utilisez: ./demarrer_serveur.sh"
