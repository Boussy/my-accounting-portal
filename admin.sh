#!/bin/bash
# Script d'administration pour FinExpert Comptabilité

RESET_DB_SCRIPT="server/reset_db.sh"

# Fonction pour afficher le menu
show_menu() {
  clear
  echo "=========================================="
  echo "  🔐 Administration FinExpert Comptabilité"
  echo "=========================================="
  echo "  Version: 1.0.0 (25 juin 2025)"
  echo
  echo "  1. Démarrer le serveur"
  echo "  2. Réinitialiser la base de données (supprime tous les utilisateurs)"
  echo "  3. Voir les utilisateurs actuels"
  echo "  4. Faire une sauvegarde de la base de données"
  echo "  5. Quitter"
  echo
  echo "=========================================="
  echo -n "  Choix: "
}

# Fonction pour démarrer le serveur
start_server() {
  echo "🚀 Démarrage du serveur..."
  ./demarrer_serveur.sh
}

# Fonction pour réinitialiser la base de données
reset_database() {
  echo "⚠️ ATTENTION: Cette action supprimera tous les utilisateurs et données!"
  echo -n "Êtes-vous sûr de vouloir continuer? (o/N): "
  read confirm

  if [[ "$confirm" == "o" || "$confirm" == "O" ]]; then
    echo "🔄 Réinitialisation de la base de données en cours..."
    if [ -f "$RESET_DB_SCRIPT" ]; then
      ./$RESET_DB_SCRIPT
    else
      echo "❌ Script de réinitialisation non trouvé: $RESET_DB_SCRIPT"
    fi
    echo "Appuyez sur Entrée pour continuer..."
    read
  else
    echo "❌ Opération annulée."
    echo "Appuyez sur Entrée pour continuer..."
    read
  fi
}

# Fonction pour voir les utilisateurs
view_users() {
  echo "📋 Liste des utilisateurs actuels:"
  echo "----------------------------------------"
  sqlite3 server/database.db "SELECT id, email, role FROM users;" -column -header
  echo "----------------------------------------"
  echo "Total: $(sqlite3 server/database.db "SELECT COUNT(*) FROM users;")"
  echo
  echo "Appuyez sur Entrée pour continuer..."
  read
}

# Fonction pour faire une sauvegarde
backup_database() {
  BACKUP_FILE="server/backup_db_$(date +%Y%m%d%H%M%S).db"
  cp server/database.db "$BACKUP_FILE"
  echo "✅ Sauvegarde créée: $BACKUP_FILE"
  echo "Appuyez sur Entrée pour continuer..."
  read
}

# Boucle principale
while true; do
  show_menu
  read choice

  case $choice in
    1) start_server; break ;;
    2) reset_database ;;
    3) view_users ;;
    4) backup_database ;;
    5) echo "Au revoir!"; exit 0 ;;
    *) echo "❌ Option invalide. Appuyez sur Entrée pour continuer..."; read ;;
  esac
done
