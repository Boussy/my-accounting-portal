// Modal de prévisualisation pour le tableau de bord comptable
document.addEventListener('DOMContentLoaded', function() {
  // Définir l'URL de l'API (s'assurer qu'elle fonctionne aussi bien en dev qu'en production)
  const API_URL = window.API_URL || 'http://localhost:3000';
  
  // On n'ajoute pas de nouveau modal si nous sommes dans dashboard_client.html qui a déjà son propre modal
  const existingModal = document.getElementById('preview-modal');
  if (existingModal) {
    console.log('Modal de prévisualisation existante détectée. Utilisation du modal existant.');
    return;
  }
  
  // Ajouter le modal au document pour les pages qui n'en ont pas
  const modalHTML = `
  <div id="document-preview-modal" class="fixed inset-0 hidden z-50 overflow-auto bg-gray-900 bg-opacity-50 flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-xl w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/4 h-3/4 flex flex-col">
      <div class="flex justify-between items-center border-b border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-800 flex items-center">
          <i id="preview-file-icon" class="far fa-file mr-2 text-custom-red"></i>
          <span id="preview-file-name">Prévisualisation du document</span>
        </h3>
        <button id="close-preview-modal" class="text-gray-500 hover:text-gray-700 transition">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="flex-grow p-4 overflow-auto">
        <div id="document-preview-container" class="h-full flex items-center justify-center">
          <!-- Le contenu de la prévisualisation sera inséré ici -->
          <div id="preview-loading" class="text-center">
            <i class="fas fa-spinner fa-spin text-custom-red text-2xl mb-2"></i>
            <p>Chargement de la prévisualisation...</p>
          </div>
        </div>
      </div>
      <div class="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
        <div class="text-sm text-gray-500">
          <span id="preview-file-info">Informations du fichier</span>
        </div>
        <div class="flex space-x-2">
          <a id="download-preview-file" href="#" class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition-colors duration-200 flex items-center">
            <i class="fas fa-download mr-2"></i> Télécharger
          </a>
          <button id="close-preview-button" class="bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center">
            <i class="fas fa-times mr-2"></i> Fermer
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
  
  // Ajouter le modal au body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Récupérer les éléments du modal
  const modal = document.getElementById('document-preview-modal');
  const closeButton = document.getElementById('close-preview-modal');
  const closePreviewButton = document.getElementById('close-preview-button');
  const previewContainer = document.getElementById('document-preview-container');
  const previewLoading = document.getElementById('preview-loading');
  const previewFileName = document.getElementById('preview-file-name');
  const previewFileIcon = document.getElementById('preview-file-icon');
  const previewFileInfo = document.getElementById('preview-file-info');
  const downloadLink = document.getElementById('download-preview-file');
  
  // Fonction pour ouvrir le modal
  function openPreviewModal(documentId, filename) {
    previewContainer.innerHTML = '';
    previewContainer.appendChild(previewLoading);
    modal.classList.remove('hidden');
    
    // Mettre à jour le nom du fichier dans le modal
    previewFileName.textContent = filename || 'Document';
    
    // Déterminer l'icône en fonction de l'extension
    const extension = filename?.split('.').pop().toLowerCase() || '';
    let fileIcon = 'far fa-file';
    
    if (['pdf'].includes(extension)) {
      fileIcon = 'far fa-file-pdf';
    } else if (['doc', 'docx'].includes(extension)) {
      fileIcon = 'far fa-file-word';
    } else if (['xls', 'xlsx'].includes(extension)) {
      fileIcon = 'far fa-file-excel';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      fileIcon = 'far fa-file-image';
    }
    
    previewFileIcon.className = `${fileIcon} mr-2 text-custom-red`;
    
    // Définir l'URL de téléchargement avec approche robuste
    const authToken = localStorage.getItem('authToken');
    const downloadUrl = `${API_URL}/api/docs/download/${documentId}?token=${authToken}`;
    downloadLink.href = downloadUrl;
    downloadLink.setAttribute('download', filename);
    downloadLink.setAttribute('rel', 'noopener noreferrer');
    
    // Ajouter un gestionnaire d'événements pour le téléchargement avec meilleure compatibilité iOS
    downloadLink.onclick = function(e) {
      e.stopPropagation();
      
      // Détection des appareils iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      // Vérification du support de l'attribut download
      const supportsDownload = "download" in document.createElement("a");
      
      // Pour les appareils iOS ou navigateurs sans support de l'attribut download
      if (isIOS || !supportsDownload) {
        // Afficher un message d'information pour iOS
        if (isIOS) {
          const iosMessage = document.createElement('div');
          iosMessage.className = 'fixed top-4 right-4 bg-blue-100 text-blue-800 px-4 py-2 rounded shadow-lg z-50';
          iosMessage.innerHTML = '<i class="fas fa-info-circle mr-2"></i> Le fichier va s\'ouvrir dans un nouvel onglet. Vous pourrez l\'enregistrer de là.';
          document.body.appendChild(iosMessage);
          
          // Faire disparaître le message après 5 secondes
          setTimeout(() => {
            iosMessage.style.opacity = '0';
            setTimeout(() => iosMessage.remove(), 500);
          }, 5000);
        }
        
        // Ouvrir dans un nouvel onglet
        window.open(downloadUrl, '_blank');
        return false;
      }
      
      return true;
    };
    
    // Charger la prévisualisation
    loadDocumentPreview(documentId, extension);
  }
  
  // Fonction pour charger la prévisualisation d'un document
  async function loadDocumentPreview(documentId, extension) {
    const authToken = localStorage.getItem('authToken');
    const previewUrl = `${API_URL}/api/docs/preview/${documentId}`;
    
    try {
      // Ajouter un gestionnaire d'événement pour le téléchargement
      const downloadMessage = document.createElement('div');
      downloadMessage.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg hidden z-50';
      downloadMessage.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Préparation du téléchargement...';
      document.body.appendChild(downloadMessage);
      
      downloadLink.addEventListener('click', function() {
        downloadMessage.classList.remove('hidden');
        setTimeout(() => {
          downloadMessage.innerHTML = '<i class="fas fa-check mr-2"></i> Téléchargement démarré';
          setTimeout(() => {
            downloadMessage.classList.add('hidden');
          }, 3000);
        }, 1000);
      });
      
      // Vérifier si le format est directement prévisualisable
      const previewableFormats = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];
      const isPreviewable = previewableFormats.includes(extension);
      
      if (isPreviewable) {
        // Ajouter les paramètres d'authentification à l'URL pour éviter les problèmes de CORS
        const securePreviewUrl = `${previewUrl}?token=${authToken}`;
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
          // Pour les images, on les affiche directement via l'URL
          previewContainer.innerHTML = `
            <div class="flex items-center justify-center h-full w-full">
              <img src="${securePreviewUrl}" 
                   class="max-w-full max-h-full object-contain mx-auto"
                   style="max-height: calc(100vh - 200px);" 
                   onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJmZWF0aGVyIGZlYXRoZXItaW1hZ2UiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjIxIDE1IDE2IDEwIDUgMjEiPjwvcG9seWxpbmU+PC9zdmc+'; this.style.padding='2rem'; this.style.width='200px';"
                   alt="Prévisualisation du document" />
            </div>
          `;
        } else if (extension === 'pdf') {
          // Pour les PDF, utiliser un object tag qui est plus fiable pour les PDF que iframe
          previewContainer.innerHTML = `
            <object data="${securePreviewUrl}" 
                    type="application/pdf" 
                    class="w-full h-full"
                    style="min-height: 70vh;">
              <div class="text-center p-8">
                <i class="far fa-file-pdf text-red-500 text-6xl mb-3"></i>
                <p class="text-xl font-semibold mb-2">Le navigateur ne peut pas afficher ce PDF</p>
                <p class="text-gray-500 mb-4">Vous pouvez le télécharger pour le visualiser.</p>
                <a href="${securePreviewUrl}" download class="bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors duration-200">
                  <i class="fas fa-download mr-2"></i> Télécharger le PDF
                </a>
              </div>
            </object>
          `;
          
          // Ajouter un message de secours si le navigateur ne peut pas afficher le PDF
          const iframe = previewContainer.querySelector('iframe');
          iframe.onerror = () => {
            previewContainer.innerHTML = `
              <div class="text-center p-8">
                <i class="far fa-file-pdf text-red-500 text-6xl mb-3"></i>
                <p class="text-xl font-semibold mb-2">Le navigateur ne peut pas afficher ce PDF</p>
                <p class="text-gray-500 mb-4">Vous pouvez le télécharger pour le visualiser.</p>
                <a href="${securePreviewUrl}" download class="bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors duration-200">
                  <i class="fas fa-download mr-2"></i> Télécharger le PDF
                </a>
              </div>
            `;
          };
        }
        
        // Mettre à jour les informations du fichier
        const response = await fetch(`${API_URL}/api/docs/${documentId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
          const fileInfo = await response.json();
          previewFileInfo.textContent = `${extension.toUpperCase()} • Mis à jour: ${new Date(fileInfo.uploaded_at || Date.now()).toLocaleDateString('fr-FR')}`;
        }
      } else {
        // Pour les formats non prévisualisables
        previewContainer.innerHTML = `
          <div class="text-center p-8">
            <i class="${previewFileIcon.className} text-6xl mb-3"></i>
            <p class="text-xl font-semibold mb-2">Aperçu non disponible</p>
            <p class="text-gray-500 mb-4">Le format ${extension.toUpperCase()} ne peut pas être prévisualisé directement.</p>
            <a href="${API_URL}/api/docs/download/${documentId}?token=${authToken}" download class="bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors duration-200">
              <i class="fas fa-download mr-2"></i> Télécharger le fichier
            </a>
          </div>
        `;
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la prévisualisation:', error);
      previewContainer.innerHTML = `
        <div class="text-center p-8">
          <i class="fas fa-exclamation-triangle text-red-500 text-6xl mb-3"></i>
          <p class="text-xl font-semibold mb-2">Erreur de prévisualisation</p>
          <p class="text-gray-500">Impossible de charger l'aperçu du document. Détail: ${error.message}</p>
          <button id="retry-preview" class="mt-4 bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded flex items-center mx-auto">
            <i class="fas fa-sync-alt mr-2"></i> Réessayer
          </button>
        </div>
      `;
      
      // Ajouter un gestionnaire pour le bouton de réessai
      const retryBtn = previewContainer.querySelector('#retry-preview');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => loadDocumentPreview(documentId, extension));
      }
    }
  }
  
  // Fermer le modal avec le bouton
  closeButton.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  closePreviewButton.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  // Fermer le modal en cliquant en dehors
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
  
  // Ajouter des écouteurs d'événements aux boutons "Voir" dans le tableau
  function addPreviewEventListeners() {
    const previewButtons = document.querySelectorAll('.preview-document');
    
    previewButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const docId = this.dataset.docId;
        const filename = this.dataset.filename;
        openPreviewModal(docId, filename);
      });
    });
  }
  
  // Observer pour les changements dans le tableau qui pourrait ajouter de nouveaux boutons
  const tableObserver = new MutationObserver(function() {
    addPreviewEventListeners();
  });
  
  const tableBody = document.getElementById('documents-table-body');
  if (tableBody) {
    tableObserver.observe(tableBody, { childList: true, subtree: true });
    addPreviewEventListeners(); // Pour les boutons initialement présents
  }
});
