#!/usr/bin/env node

/**
 * Script principal de migration des fichiers vers la nouvelle structure
 * - Étape 1 : Migration des fichiers vers la nouvelle structure
 * - Étape 2 : Nettoyage des anciens dossiers vides
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Début de la migration des fichiers téléversés...');

// Fonction pour exécuter un script Node et attendre sa fin
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`Exécution de ${path.basename(scriptPath)}...`);
    
    const process = spawn('node', [scriptPath], { stdio: 'inherit' });
    
    process.on('close', code => {
      if (code === 0) {
        console.log(`✅ Script ${path.basename(scriptPath)} terminé avec succès.`);
        resolve();
      } else {
        console.error(`❌ Script ${path.basename(scriptPath)} a échoué avec le code ${code}.`);
        reject(new Error(`Script failed with code ${code}`));
      }
    });
    
    process.on('error', err => {
      console.error(`❌ Erreur lors de l'exécution de ${path.basename(scriptPath)}:`, err);
      reject(err);
    });
  });
}

// Chemin des scripts à exécuter
const migrateScript = path.join(__dirname, 'migrate_uploads.js');
const cleanScript = path.join(__dirname, 'clean_uploads.js');

// Exécuter les scripts en séquence
async function runMigration() {
  try {
    // Étape 1: Migration des fichiers
    await runScript(migrateScript);
    
    // Étape 2: Nettoyage des dossiers vides
    await runScript(cleanScript);
    
    console.log('✨ Migration complétée avec succès!');
    console.log('📁 Les fichiers sont maintenant organisés par client et par date.');
  } catch (error) {
    console.error('❌ La migration a échoué:', error.message);
    process.exit(1);
  }
}

// Démarrer la migration
runMigration();
