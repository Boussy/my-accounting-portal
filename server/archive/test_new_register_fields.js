// Script de test pour le formulaire d'inscription avec les nouveaux champs
const axios = require('axios');
const chalk = require('chalk');

const API_URL = 'http://localhost:3000';

// Données de test pour un client
const testClient = {
  email: `client.test.${new Date().getTime()}@example.com`, // Email unique à chaque exécution
  password: 'Test@123456',
  role: 'client',
  nom: 'Dupont',
  prenom: 'Jean',
  entreprise: 'Entreprise Test SAS',
  adresse: '123 rue des Tests, 75001 Paris',
  numero: '01 23 45 67 89',
  rgpd_accepted: true,
  cgu_accepted: true
};

// Test d'inscription avec tous les champs
async function testRegisterWithAllFields() {
  console.log(chalk.blue('Test d\'inscription avec tous les champs requis...'));
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, testClient);
    console.log(chalk.green('✓ Inscription réussie!'));
    console.log(chalk.gray('Réponse:'), response.data);
    return true;
  } catch (error) {
    console.log(chalk.red('✗ Échec de l\'inscription:'));
    console.log(chalk.red(error.response ? error.response.data.message : error.message));
    return false;
  }
}

// Test d'inscription sans le RGPD
async function testRegisterWithoutRGPD() {
  console.log(chalk.blue('\nTest d\'inscription sans acceptation RGPD...'));
  
  const testData = { ...testClient };
  testData.email = `client.test2.${new Date().getTime()}@example.com`; // Nouvel email
  testData.rgpd_accepted = false;
  
  try {
    await axios.post(`${API_URL}/api/auth/register`, testData);
    console.log(chalk.red('✗ L\'inscription a réussi alors qu\'elle devrait échouer'));
    return false;
  } catch (error) {
    if (error.response && error.response.data.message.includes('RGPD')) {
      console.log(chalk.green('✓ Test réussi! Refus d\'inscription sans RGPD'));
      console.log(chalk.gray('Message d\'erreur:'), error.response.data.message);
      return true;
    } else {
      console.log(chalk.red('✗ Erreur inattendue:'));
      console.log(chalk.red(error.response ? error.response.data.message : error.message));
      return false;
    }
  }
}

// Test d'inscription sans les CGU
async function testRegisterWithoutCGU() {
  console.log(chalk.blue('\nTest d\'inscription sans acceptation CGU...'));
  
  const testData = { ...testClient };
  testData.email = `client.test3.${new Date().getTime()}@example.com`; // Nouvel email
  testData.cgu_accepted = false;
  
  try {
    await axios.post(`${API_URL}/api/auth/register`, testData);
    console.log(chalk.red('✗ L\'inscription a réussi alors qu\'elle devrait échouer'));
    return false;
  } catch (error) {
    if (error.response && error.response.data.message.includes('CGU')) {
      console.log(chalk.green('✓ Test réussi! Refus d\'inscription sans CGU'));
      console.log(chalk.gray('Message d\'erreur:'), error.response.data.message);
      return true;
    } else {
      console.log(chalk.red('✗ Erreur inattendue:'));
      console.log(chalk.red(error.response ? error.response.data.message : error.message));
      return false;
    }
  }
}

// Test d'inscription sans l'entreprise
async function testRegisterWithoutCompany() {
  console.log(chalk.blue('\nTest d\'inscription sans nom d\'entreprise...'));
  
  const testData = { ...testClient };
  testData.email = `client.test4.${new Date().getTime()}@example.com`; // Nouvel email
  delete testData.entreprise;
  
  try {
    await axios.post(`${API_URL}/api/auth/register`, testData);
    console.log(chalk.red('✗ L\'inscription a réussi alors qu\'elle devrait échouer'));
    return false;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(chalk.green('✓ Test réussi! Refus d\'inscription sans entreprise'));
      console.log(chalk.gray('Message d\'erreur:'), error.response.data.message);
      return true;
    } else {
      console.log(chalk.red('✗ Erreur inattendue:'));
      console.log(chalk.red(error.response ? error.response.data.message : error.message));
      return false;
    }
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log(chalk.yellow('=== TESTS D\'INSCRIPTION AVEC NOUVEAUX CHAMPS ==='));
  console.log(chalk.gray(`Date: ${new Date().toLocaleString()}`));
  console.log(chalk.gray(`API: ${API_URL}\n`));
  
  let successCount = 0;
  const totalTests = 4;
  
  if (await testRegisterWithAllFields()) successCount++;
  if (await testRegisterWithoutRGPD()) successCount++;
  if (await testRegisterWithoutCGU()) successCount++;
  if (await testRegisterWithoutCompany()) successCount++;
  
  console.log('\n' + chalk.yellow('=== RÉSULTATS DES TESTS ==='));
  console.log(`${successCount} test(s) réussi(s) sur ${totalTests}\n`);
  
  if (successCount === totalTests) {
    console.log(chalk.green('✓ Tous les tests ont réussi!'));
  } else {
    console.log(chalk.red(`✗ ${totalTests - successCount} test(s) ont échoué`));
  }
}

// S'assurer que le serveur est en cours d'exécution avant de lancer les tests
console.log(chalk.gray('Vérification de la disponibilité du serveur...'));
axios.get(`${API_URL}/api/auth`)
  .then(() => {
    runAllTests();
  })
  .catch((error) => {
    console.log(chalk.red('✗ Impossible de se connecter au serveur. Assurez-vous que le serveur est en cours d\'exécution.'));
    console.log(chalk.red(`Erreur: ${error.message}`));
  });
