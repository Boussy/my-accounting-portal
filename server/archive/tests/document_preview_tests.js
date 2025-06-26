// Tests pour la prévisualisation des documents
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const fs = require('fs');
const path = require('path');
const app = require('../index');

chai.use(chaiHttp);

describe('Document Preview API Tests', () => {
  let authToken;
  let uploadedDocId;
  const testFilePath = path.join(__dirname, 'test_upload.pdf');

  // Créer un fichier de test avant les tests
  before(async () => {
    // Créer un fichier PDF simple pour le test
    try {
      // Vérifier si le fichier existe déjà
      if (!fs.existsSync(testFilePath)) {
        // Créer un contenu minimal de PDF pour les tests
        const minimalPdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000054 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF';
        fs.writeFileSync(testFilePath, minimalPdf);
      }

      // Connexion à l'API pour obtenir un token
      const loginRes = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'comptable@test.com',
          password: 'TestPassword123!'
        });

      authToken = loginRes.body.token;

      // Upload du fichier de test
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));

      const uploadRes = await chai.request(app)
        .post('/api/docs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send(formData);

      uploadedDocId = uploadRes.body.documentId;
    } catch (err) {
      console.error('Erreur dans la configuration des tests:', err);
    }
  });

  // Nettoyer les fichiers de test après
  after(async () => {
    try {
      // Supprimer le document de test
      await chai.request(app)
        .delete(`/api/docs/${uploadedDocId}`)
        .set('Authorization', `Bearer ${authToken}`);
        
      // Supprimer le fichier de test
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (err) {
      console.error('Erreur dans le nettoyage des tests:', err);
    }
  });

  // Test de la route de prévisualisation pour un PDF
  it('Devrait retourner une prévisualisation du document PDF', async () => {
    const res = await chai.request(app)
      .get(`/api/docs/preview/${uploadedDocId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res).to.have.header('content-type', 'application/pdf');
  });
  
  // Test pour un document qui n'existe pas
  it('Devrait retourner une erreur 404 pour un document inexistant', async () => {
    const nonExistentId = 99999;
    const res = await chai.request(app)
      .get(`/api/docs/preview/${nonExistentId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(404);
  });
  
  // Test sans autorisation
  it('Devrait refuser l\'accès sans autorisation', async () => {
    const res = await chai.request(app)
      .get(`/api/docs/preview/${uploadedDocId}`);
    
    expect(res).to.have.status(401);
  });
  
  // Prévisualisation des formats pris en charge
  it('Devrait indiquer les formats supportés', async () => {
    const res = await chai.request(app)
      .get('/api/docs/supported-formats')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body).to.have.property('formats');
    expect(res.body.formats).to.be.an('array');
    expect(res.body.formats).to.include('pdf');
  });
});
