// Script pour mettre à jour automatiquement la date du jour
document.addEventListener('DOMContentLoaded', function() {
  // Fonction pour formater la date en français avec différents formats
  function formatDateInFrench(date, format = 'long') {
    let options;
    
    switch (format) {
      case 'short':
        options = { day: 'numeric', month: 'numeric', year: 'numeric' };
        break;
      case 'medium':
        options = { day: 'numeric', month: 'short', year: 'numeric' };
        break;
      case 'full':
        options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        break;
      case 'long':
      default:
        options = { day: 'numeric', month: 'long', year: 'numeric' };
        break;
    }
    
    return date.toLocaleDateString('fr-FR', options);
  }
  
  // Mettre à jour tous les éléments avec la classe "current-date" ou l'id "current-date"
  const today = new Date();
  
  // Mettre à jour les éléments avec ID "current-date"
  const currentDateElement = document.getElementById('current-date');
  if (currentDateElement) {
    // Vérifier si un format est spécifié dans l'attribut data-format
    const format = currentDateElement.dataset.format || 'long';
    currentDateElement.textContent = formatDateInFrench(today, format);
  }
  
  // Mettre à jour tous les éléments avec la classe "current-date"
  const dateElements = document.querySelectorAll('.current-date');
  dateElements.forEach(element => {
    // Vérifier si un format est spécifié dans l'attribut data-format
    const format = element.dataset.format || 'long';
    element.textContent = formatDateInFrench(today, format);
  });
});
