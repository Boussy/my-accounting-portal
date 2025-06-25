// Script pour tester la création d'un utilisateur professionnel
const fetch = require('node-fetch');

async function testProRegistration() {
  try {
    const testEmail = `pro_${Date.now()}@test.com`;
    
    console.log('📝 Test d\'inscription utilisateur professionnel');
    console.log(`Email: ${testEmail}`);
    console.log('Rôle: professionnel');
    console.log('Mot de passe: Password123!');
    
    // Inscription
    console.log('Envoi de la requête d\'inscription...');
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        role: 'professionnel'
      })
    });
    
    const data = await response.json();
    
    console.log('✅ Réponse du serveur:');
    console.log(`Status: ${response.status}`);
    console.log('Données:', data);
    
    if (response.ok) {
      // Tester la connexion avec le compte nouvellement créé
      console.log('\n🔑 Test de connexion avec le nouveau compte:');
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'Password123!'
        })
      });
      
      const loginData = await loginResponse.json();
      
      console.log('✅ Réponse de connexion:');
      console.log(`Status: ${loginResponse.status}`);
      console.log('Données:', loginData);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testProRegistration();

testProRegistration();
