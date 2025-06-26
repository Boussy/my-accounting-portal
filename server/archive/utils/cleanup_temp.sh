#!/bin/bash

# Script pour supprimer les fichiers temporaires après la migration

echo "🧹 Nettoyage des fichiers temporaires..."

# Chemin de base
BASE_DIR="/Users/boussy/Desktop/my_accounting-portal/server"

# Liste des fichiers à supprimer après migration réussie
FILES_TO_REMOVE=(
  "migrate_uploads.js"
  "clean_uploads.js"
  "migrate_file_structure.js"
  "cleanup_temp.sh"
)

# Supprimer les fichiers
for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$BASE_DIR/$file" ]; then
    echo "Suppression de $file"
    rm "$BASE_DIR/$file"
  fi
done

echo "✅ Nettoyage terminé!"
