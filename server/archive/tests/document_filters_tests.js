// Tests pour les filtres de documents
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('../index');
const fs = require('fs');
const path = require('path');

chai.use(chaiHttp);

describe('Document Filters API Tests', () => {
  let authToken;
  let uploadedDocIds = [];
  const testFiles = [
    {
      path: path.join(__dirname, 'test_pdf.pdf'),
      content: '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000054 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF',
      type: 'pdf'
    },
    {
      path: path.join(__dirname, 'test_doc.docx'),
      content: 'Test document Word',
      type: 'docx'
    },
    {
      path: path.join(__dirname, 'test_image.jpg'),
      content: 'Fake JPG content for testing',
      type: 'jpg'
    }
  ];

  // Créer des fichiers de test et se connecter avant les tests
  before(async () => {
    try {
      // Créer les fichiers de test
      testFiles.forEach(file => {
        if (!fs.existsSync(file.path)) {
          fs.writeFileSync(file.path, file.content);
        }
      });

      // Connexion à l'API pour obtenir un token
      const loginRes = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'comptable@test.com',
          password: 'TestPassword123!'
        });
        
      authToken = loginRes.body.token;

      // Uploader les fichiers de test
      for (const file of testFiles) {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(file.path));

        const uploadRes = await chai.request(app)
          .post('/api/docs/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .send(formData);

        uploadedDocIds.push(uploadRes.body.documentId);
      }
    } catch (err) {
      console.error('Erreur dans la configuration des tests:', err);
    }
  });

  // Nettoyer les fichiers de test après
  after(async () => {
    try {
      // Supprimer les documents de test
      for (const docId of uploadedDocIds) {
        await chai.request(app)
          .delete(`/api/docs/${docId}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // Supprimer les fichiers de test
      testFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    } catch (err) {
      console.error('Erreur dans le nettoyage des tests:', err);
    }
  });

  // Test de récupération de tous les documents
  it('Devrait récupérer tous les documents sans filtre', async () => {
    const res = await chai.request(app)
      .get('/api/docs/all')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body).to.have.property('allDocs');
    expect(res.body.allDocs).to.be.an('array');
    
    // Vérifier que nos documents de test sont présents
    const uploadedIds = uploadedDocIds.map(String);
    const returnedIds = res.body.allDocs.map(doc => String(doc.id));
    
    uploadedIds.forEach(id => {
      expect(returnedIds).to.include(id);
    });
  });

  // Test de filtrage par type de document
  it('Devrait filtrer les documents par type (PDF)', async () => {
    const res = await chai.request(app)
      .get('/api/docs/filter')
      .query({ type: 'pdf' })
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body.documents).to.be.an('array');
    
    // Vérifier que tous les documents retournés sont des PDF
    res.body.documents.forEach(doc => {
      expect(doc.filename.toLowerCase().endsWith('.pdf')).to.be.true;
    });
  });

  // Test de filtrage par statut
  it('Devrait filtrer les documents par statut', async () => {
    // D'abord, définissons un statut pour un document
    const docId = uploadedDocIds[0];
    await chai.request(app)
      .put(`/api/docs/status/${docId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'processing' });
    
    // Ensuite, récupérons les documents avec ce statut
    const res = await chai.request(app)
      .get('/api/docs/filter')
      .query({ status: 'processing' })
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body.documents).to.be.an('array');
    
    // Vérifier que tous les documents retournés ont le bon statut
    res.body.documents.forEach(doc => {
      expect(doc.status).to.equal('processing');
    });
    
    // Vérifier que notre document modifié est inclus
    const docIncluded = res.body.documents.some(doc => String(doc.id) === String(docId));
    expect(docIncluded).to.be.true;
  });

  // Test de filtrage par dates
  it('Devrait filtrer les documents par plage de dates', async () => {
    // Utiliser la date d'aujourd'hui et quelques jours avant/après
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    
    // Format YYYY-MM-DD pour les requêtes
    const fromDate = threeDaysAgo.toISOString().split('T')[0];
    const toDate = threeDaysLater.toISOString().split('T')[0];
    
    const res = await chai.request(app)
      .get('/api/docs/filter')
      .query({ 
        from: fromDate,
        to: toDate
      })
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body.documents).to.be.an('array');
    
    // Vérifier que tous les documents ont été créés dans la plage de dates spécifiée
    res.body.documents.forEach(doc => {
      const docDate = new Date(doc.uploaded_at);
      expect(docDate >= threeDaysAgo && docDate <= threeDaysLater).to.be.true;
    });
  });

  // Test de combinaison de filtres
  it('Devrait combiner plusieurs filtres correctement', async () => {
    const res = await chai.request(app)
      .get('/api/docs/filter')
      .query({ 
        status: 'processing',
        type: 'pdf'
      })
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res).to.have.status(200);
    expect(res.body.documents).to.be.an('array');
    
    // Vérifier que tous les documents correspondent aux deux critères
    res.body.documents.forEach(doc => {
      expect(doc.status).to.equal('processing');
      expect(doc.filename.toLowerCase().endsWith('.pdf')).to.be.true;
    });
  });
});
