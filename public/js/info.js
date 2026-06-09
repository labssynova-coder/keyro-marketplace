const INFO_PAGES = {
  help: {
    title: "Centre d'aide",
    body: [
      "Notre support traite les demandes liées aux commandes, paiements, activations et comptes.",
      "Préparez votre numéro de commande et l'adresse email du compte pour accélérer la réponse."
    ]
  },
  faq: {
    title: 'FAQ',
    body: [
      "Les clés et identifiants sont disponibles dans votre espace compte après validation du paiement.",
      "Si une clé ne fonctionne pas, contactez le support avec une capture du message d'erreur."
    ]
  },
  refunds: {
    title: 'Politique de retour',
    body: [
      "Les produits digitaux non révélés peuvent être remboursés selon l'état de la commande.",
      "Une clé ou un compte déjà révélé ne peut généralement plus être repris, sauf défaut confirmé."
    ]
  },
  contact: {
    title: 'Nous contacter',
    body: [
      'Email support: support@keyro.example',
      'Délai de réponse indicatif: 24 à 48 heures ouvrées.'
    ]
  },
  terms: {
    title: 'Conditions générales',
    body: [
      "Keyro vend des produits digitaux. L'achat implique l'acceptation des conditions affichées au moment du paiement.",
      "Le client doit vérifier la plateforme, la région et le type d'activation avant de payer."
    ]
  },
  privacy: {
    title: 'Politique de confidentialité',
    body: [
      "Les données de compte et de commande sont utilisées pour fournir le service, prévenir la fraude et assurer le support.",
      "Les données de paiement sont traitées par le système de paiement marchand; Keyro ne doit pas stocker les numéros de carte."
    ]
  },
  legal: {
    title: 'Mentions légales',
    body: [
      'Éditeur: Keyro.',
      'Ces mentions doivent être complétées avec la société, adresse, numéro fiscal et contact légal avant lancement public.'
    ]
  },
  cookies: {
    title: 'Cookies',
    body: [
      "Le site utilise des cookies nécessaires à la session, à la sécurité et au fonctionnement du panier.",
      "Tout outil d'analyse ou marketing ajouté plus tard devra être déclaré ici."
    ]
  }
};

function renderInfo(slug) {
  const el = document.getElementById('infoContent');
  if (!el) return;
  const page = INFO_PAGES[slug] || INFO_PAGES.help;
  el.innerHTML = `<div class="info-page">
    <button class="btn btn-ghost" onclick="navigate('home')" style="margin-bottom:20px;color:var(--muted);font-size:.875rem">← Retour</button>
    <h1>${escHTML(page.title)}</h1>
    ${page.body.map(p => `<p>${escHTML(p)}</p>`).join('')}
  </div>`;
}
