// Tests pour la gestion des statuts des documents
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('../index');
const db = require('../models/db');

chai.use(chaiHttp);

describe('Document Status API Tests', () => {
  let authToken;
  let clientToken;
  let documentId;

  // Avant tous les tests, connectez-vous en tant que comptable pour obtenir un token
  before(async () => {
    // Login en tant que comptable
    const comptableRes = await chai.request(app)
      .post('/api/auth/login')
      .send({
        email: 'comptable@test.com',
        password: 'TestPassword123!'
      });
    
    authToken = comptableRes.body.token;
    
    // Login en tant que client
    const clientRes = await chai.request(app)
      .post('/api/auth/login')
      .send({
        email: 'client@test.com',
        password: 'ClientPass123!'
      });
    
    clientToken = clientRes.body.token;
    
    // Créer un document test pour le client
    const formData = new FormData();
    formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test_document.txt');
    
    const uploadRes = await chai.request(app)
      .post('/api/docs/upload')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(formData);
    
    documentId = uploadRes.body.documentId;
  });
  
  // Après tous les tests, nettoyez les données de test
  after(async () => {
    if (documentId) {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM documents WHERE id = ?', [documentId], (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }
  });
  
  // Test pour vérifier que le statut initial est "pending"
  it('Le document créé devrait avoir le statut "pending"', async () => {
    const res = await chai.request(app)
      .get('/api/docs/mydocs')
      .set('Authorization', `Bearer ${clientToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body.allDocs).to.be.an('array');
    expect(res.body.allDocs.find(doc => doc.id === documentId)).to.have.property('status', 'pending');
  });
  
  // Test pour mettre à jour le statut d'un document
  it('Devrait mettre à jour le statut du document en "processing"', async () => {
    const res = await chai.request(app)
      .put(`/api/docs/status/${documentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'processing' });
    
    expect(res).to.have.status(200);
    expect(res.body).to.have.property('message', 'Statut mis à jour avec succès.');
    expect(res.body).to.have.property('newStatus', 'processing');
  });
  
  // Vérifier que le statut a bien été mis à jour
  it('Le document devrait avoir le statut "processing" après mise à jour', async () => {
    const res = await chai.request(app)
      .get('/api/docs/all')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body.allDocs).to.be.an('array');
    expect(res.body.allDocs.find(doc => doc.id === documentId)).to.have.property('status', 'processing');
  });
  
  // Test de validation avec statut "validated"
  it('Devrait mettre à jour le statut du document en "validated"', async () => {
    const res = await chai.request(app)
      .put(`/api/docs/status/${documentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'validated' });
    
    expect(res).to.have.status(200);
    expect(res.body).to.have.property('message', 'Statut mis à jour avec succès.');
    expect(res.body).to.have.property('newStatus', 'validated');
  });
  
  // Test avec un statut invalide
  it('Devrait rejeter un statut invalide', async () => {
    const res = await chai.request(app)
      .put(`/api/docs/status/${documentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'invalid_status' });
    
    expect(res).to.have.status(400);
    expect(res.body).to.have.property('message', 'Statut non valide.');
  });
  
  // Test sans autorisation
  it('Devrait refuser la mise à jour du statut par un client', async () => {
    const res = await chai.request(app)
      .put(`/api/docs/status/${documentId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'processing' });
    
    expect(res).to.have.status(403);
    expect(res.body).to.have.property('message').that.includes('Accès refusé');
  });
});
