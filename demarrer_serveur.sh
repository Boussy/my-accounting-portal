#!/bin/bash
# Script pour démarrer le serveur FinExpert Comptabilité

echo "🔄 Démarrage du serveur FinExpert Comptabilité..."

# Se déplacer dans le répertoire du serveur
cd server

# Vérifier la version du script
SCRIPT_VERSION="1.2.0"
echo "📋 Version du script: ${SCRIPT_VERSION} (25 juin 2025 - Politique de mots de passe forts)"

# Vérifier si les modules sont installés, sinon les installer
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Vérifier si le fichier .env existe, sinon le créer
if [ ! -f ".env" ]; then
    echo "📄 Création du fichier .env..."
    echo "PORT=3000" > .env
    echo "JWT_SECRET=super_secret_key" >> .env
fi

# Mise à jour du port dans .env existant (si nécessaire)
sed -i '' 's/PORT=5000/PORT=3000/g' .env 2>/dev/null || true

# Vérifier si les ports sont utilisés
if lsof -i:3000 > /dev/null; then
    echo "⚠️ Le port 3000 est déjà utilisé. Tentative d'arrêt du processus..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
    sleep 2
fi

# Démarrer le serveur avec nodemon pour le redémarrage automatique en cas de modification
echo "🚀 Lancement du serveur sur http://localhost:3000"
echo "📋 Logs du serveur:"
NODE_ENV=development npx nodemon index.js
