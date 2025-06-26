// Fichier de filtres pour le tableau de bord client
document.addEventListener('DOMContentLoaded', function() {
  // API URL
  const API_URL = 'http://localhost:3000';

  // Éléments du DOM pour les filtres
  const statusFilter = document.getElementById('status-filter');
  const doctypeFilter = document.getElementById('doctype-filter');
  const searchInput = document.getElementById('search-input');
  const resetFiltersBtn = document.getElementById('reset-filters');
  
  // Fonction pour appliquer les filtres
  async function applyFilters() {
    try {
      // Récupérer les valeurs des filtres
      const statusValue = statusFilter?.value || '';
      const doctypeValue = doctypeFilter?.value || '';
      const searchValue = searchInput?.value || '';
      
      // Construire les paramètres de requête
      const queryParams = new URLSearchParams();
      if (statusValue) queryParams.append('status', statusValue);
      if (doctypeValue) queryParams.append('type', doctypeValue);
      if (searchValue) queryParams.append('search', searchValue);
      
      // Obtenir le token d'authentification
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.error('Token d\'authentification non trouvé');
        return;
      }
      
      // Faire la requête API
      const url = queryParams.toString() 
        ? `${API_URL}/api/docs/filter?${queryParams.toString()}`
        : `${API_URL}/api/docs/mydocs`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur: ${response.status}`);
      }
      
      // Traiter la réponse
      const data = await response.json();
      
      // Mettre à jour les données et l'interface
      if (data.documents) {
        // Format de l'API de filtrage
        window.documentsData = {
          allDocs: data.documents,
          byDate: {}
        };
      } else {
        // Format de l'API standard (mydocs)
        window.documentsData = data;
      }
      
      // Mettre à jour l'UI
      window.updateDocumentsTable();
      window.updateDocumentStats();
      
    } catch (error) {
      console.error('Erreur lors de l\'application des filtres:', error);
      showNotification('Erreur lors du filtrage des documents', true);
    }
  }
  
  // Fonction pour réinitialiser les filtres
  function resetFilters() {
    if (statusFilter) statusFilter.value = '';
    if (doctypeFilter) doctypeFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    // Rechargement des documents sans filtre
    loadUserDocuments();
    
    // Afficher une notification
    showNotification('Filtres réinitialisés');
  }
  
  // Initialiser les écouteurs d'événements
  function initializeEventListeners() {
    // Filtres de base
    if (statusFilter) {
      statusFilter.addEventListener('change', applyFilters);
    }
    
    if (doctypeFilter) {
      doctypeFilter.addEventListener('change', applyFilters);
    }
    
    // Recherche avec debounce
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (this.value.length >= 2 || this.value.length === 0) {
            applyFilters();
          }
        }, 300);
      });
    }
    
    // Bouton de réinitialisation
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', resetFilters);
    }
  }
  
  // Exposer les fonctions au scope global
  window.applyClientFilters = applyFilters;
  window.resetClientFilters = resetFilters;
  
  // Initialiser
  initializeEventListeners();
});
