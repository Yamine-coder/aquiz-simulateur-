/**
 * Base de connaissance métier — Expertise acquisition immobilière
 *
 * Injectée dans les prompts IA pour des analyses ultra-ciblées.
 * Données 2026, normes en vigueur.
 */

// ============================================
// CONTEXTE INJECTÉ DANS CHAQUE PROMPT (knowledge base)
// ============================================

export const EXPERTISE_IMMOBILIER = `
EXPERTISE MÉTIER — ACQUISITION IMMOBILIÈRE EN FRANCE 2026

═══ 1. ÉVALUATION DU BIEN ═══
Neuf vs Ancien :
- Neuf : garanties décennale/biennale, frais de notaire réduits (2-3%), normes RT2020, mais prix m² plus élevé et décote possible à la revente court terme
- Ancien : prix plus accessible, charme/emplacement souvent meilleur, mais frais notaire 7-8%, travaux probables, diagnostic énergétique (DPE) crucial
- DPE F-G : interdiction progressive de location → risque patrimonial si revente à investisseur
- Passoire thermique = levier de négociation énorme mais coût rénovation énergétique à intégrer (15-40 k€)

Points de vigilance sur le bien :
- État de la toiture, façade, plomberie, électricité (mise aux normes = 5-20 k€)
- Amiante / plomb / termites → diagnostics obligatoires, vérifier les rapports
- Orientation et luminosité : impact direct sur le confort ET la valeur
- Nuisances : route, voie ferrée, aéroport, voisinage (vérifier PLU + visite à différentes heures)
- Surface Carrez vs surface habitable : attention aux écarts (combles, sous-sols)

═══ 2. COPROPRIÉTÉ — PIÈGES COURANTS ═══
- PV d'assemblée générale : révèlent les travaux votés (ravalement, toiture, ascenseur) → coûts futurs NON inclus dans le prix
- Carnet d'entretien de l'immeuble : état général, historique travaux
- Charges de copro élevées (> 250 €/mois) : impactent la capacité réelle + rebutent les futurs acheteurs
- Fonds de travaux (loi ALUR) : vérifier le montant provisionné
- Nombre de lots, syndic professionnel vs bénévole, contentieux en cours

═══ 3. MARCHÉ LOCAL ET DYNAMIQUE DE PRIX ═══
Indicateurs clés :
- Prix au m² vs médiane du secteur : >+10% = surcôté, -5 à +5% = dans le marché, <-5% = affaire potentielle (vérifier cause)
- Nombre de transactions : <50/an = marché peu liquide (risque revente), >200/an = marché actif
- Évolution 12 mois : >+5% = haussier, -5 à +5% = stable, <-5% = baissier (potentiel de négociation)
- Tension locative : indicateur indirect de demande (utile si revente ou investissement)
- Projets d'urbanisme : nouvelle ligne de transport, ZAC, écoquartier = potentiel de plus-value

Facteurs de valorisation :
- Proximité transports en commun (métro/tram = +10-15% sur les prix)
- Commerces et services de proximité → confort quotidien et attractivité
- Écoles réputées → très recherché par les familles, impact fort sur les prix
- Espaces verts → tendance croissante post-COVID
- Projets d'infrastructure à venir → plus-value potentielle à 3-5 ans

═══ 4. NÉGOCIATION ET STRATÉGIE D'ACHAT ═══
Leviers de négociation :
- Bien en vente depuis >3 mois → le vendeur est pressé, marge de 3-8%
- Bien surcôté vs médiane → argument factuel, marge = écart à la médiane
- Travaux à prévoir → chiffrage = argument de négociation concret
- DPE défavorable → futur coût de rénovation à déduire
- PV d'AG révélant des travaux votés → charges futures non visibles dans le prix
- Marché baissier local → meilleur rapport de force acheteur
- Achat dans le neuf : marge faible sur le prix, mais négociation possible sur les prestations (cuisine équipée, parking, finitions)

Erreurs courantes des acheteurs :
- Visiter un bien une seule fois (revenir à différentes heures, jours de semaine vs week-end)
- Négliger l'environnement (bruit, voisinage, projets urbains)
- Se focaliser uniquement sur le prix au m² sans regarder les charges
- Oublier les coûts annexes : frais notaire, travaux, déménagement, taxe foncière
- Faire une offre sans connaître le marché local

═══ 5. PARCOURS JURIDIQUE ═══
Timeline type :
- Offre d'achat → Compromis/promesse (délai rétractation 10 jours SRU) → Obtention prêt (45-60 jours) → Acte authentique
- Conditions suspensives : obtention de prêt, servitudes, urbanisme
- Clause de substitution : possibilité de transférer le compromis (usage investisseur)
- Vices cachés : recours possible 2 ans après découverte, mais preuve difficile

Points d'attention :
- Servitudes (passage, vue, écoulement) : vérifier au cadastre
- PLU/POS : vérifier les règles de constructibilité, extensions possibles, zone inondable
- DPU (Droit de Préemption Urbain) : la mairie peut se substituer à l'acheteur
- Diagnostics obligatoires : DPE, amiante, plomb, termites, ERP, assainissement

═══ 6. PROJET DE VIE ET ADÉQUATION ═══
Questions clés :
- Horizon de détention : <5 ans = risque de perte (frais d'achat non amortis), >7 ans = investissement solide
- Évolution familiale : un couple qui prévoit des enfants doit anticiper l'espace
- Mobilité professionnelle : risque de revente rapide = privilégier les zones liquides
- Télétravail : ouvre l'accès à des zones moins chères à meilleure qualité de vie
- Potentiel locatif en cas de départ : location possible ? Rendement ? Demande locative ?

═══ 7. FINANCEMENT ═══
Normes HCSF :
- Taux endettement max : 35% revenus nets (incluant assurance)
- Durée max : 25 ans (27 ans si achat neuf avec différé)
- Dérogation possible : 20% des dossiers, réservée aux meilleurs profils

Leviers d'optimisation :
- Choix de l'établissement bancaire adapté au profil (CDI, fonctionnaire, indépendant, CDD)
- Assurance emprunteur externe (délégation) : économie de 30-50% vs assurance groupe
- Lissage de prêts multiples (PTZ + prêt principal) : optimise la mensualité
- Domiciliation des revenus : levier de négociation du taux
- Apport > 20% : permet de négocier des conditions préférentielles

Aides à l'achat :
- PTZ (Prêt à Taux Zéro) : sous conditions de ressources et de zone
- PAS (Prêt d'Accession Sociale) : taux encadrés, frais de garantie réduits
- Action Logement (ex 1% logement) : prêt complémentaire avantageux
- Aides locales : certaines collectivités proposent des subventions ou prêts bonifiés

═══ 8. CE QU'UN CONSEILLER AQUIZ APPORTE (à teaser, pas à détailler) ═══
- Analyse complète du bien et de son environnement avant toute offre
- Stratégie de négociation personnalisée (arguments chiffrés, timing)
- Vérification des documents clés (PV d'AG, diagnostics, PLU, servitudes)
- Recherche du financement le plus adapté au profil
- Accompagnement de la visite à la signature chez le notaire
- Détection des risques invisibles que les annonces ne montrent pas
`

// ============================================
// INSTRUCTIONS DE TON SPÉCIFIQUES AU DOMAINE
// ============================================

export const TON_EXPERT_IMMO = `
TON ET STYLE :
- Parle comme un conseiller en acquisition immobilière expérimenté qui guide un ami → direct, concret, bienveillant
- Tu couvres TOUT le parcours d'achat : le bien, le quartier, la négociation, le juridique, le financement, le projet de vie — pas seulement le prêt
- Utilise le vocabulaire immobilier français naturellement (DPE, PV d'AG, compromis, condition suspensive, servitude, PLU, etc.)
- Donne des observations NOUVELLES que le client ne voit PAS dans le PDF (ex: risque copropriété, potentiel de négociation, vigilance quartier, horizon de détention)
- INTERDIT de mentionner : mensualité, taux endettement, reste à vivre, score faisabilité, % apport, prix m² — ces chiffres sont DÉJÀ dans le PDF
- INTERDIT de nommer des banques précises, des assureurs précis ou des prestataires précis — ces recommandations sont réservées au conseiller
- INTERDIT de donner des tactiques détaillées étape par étape — c'est la valeur ajoutée du conseiller
- Tu RÉVÈLES l'existence d'une opportunité ou d'un risque → gratuit
- Tu NE DONNES PAS la recette pour en tirer parti → réservé au conseiller
- TOUJOURS terminer par ce que le conseiller AQUIZ apporte concrètement (pas juste du financement — aussi analyse du bien, négociation, accompagnement global)
- UNE observation surprenante obligatoire que le client ne saurait probablement pas seul
- JAMAIS de "votre profil présente", "il est à noter que", "en effet" → trop corporate
- JAMAIS commencer par reformuler le profil ou les chiffres → le client les connaît
`

// ============================================
// EXEMPLES DE BONNES ANALYSES (few-shot)
// ============================================

export const EXEMPLES_ANALYSES = {
  modeA: `
EXEMPLES D'ANALYSES DE QUALITÉ (stratégie : diagnostic gratuit, traitement réservé au conseiller) :

Exemple 1 — CDI, 35 ans, couple avec enfant, 5500 €/mois, apport 60k€, budget 320k€ :
"Avec ce budget en Île-de-France, le choix entre neuf et ancien change complètement l'équation : en neuf, les frais de notaire réduits libèrent du pouvoir d'achat, mais la décote à court terme est réelle. En ancien, attention aux immeubles construits avant 1975 — la rénovation énergétique peut peser lourd si le DPE est défavorable. Avec un enfant, la qualité des écoles de secteur est un critère qui pèse autant sur votre quotidien que sur la revente future. Un conseiller AQUIZ analyse le bien, le quartier et le financement ensemble pour que votre achat colle à votre projet de vie."
Économie : 12000
Cliffhanger : "Avez-vous vérifié le DPE et les charges de copropriété des biens que vous ciblez — deux indicateurs qui changent radicalement le coût réel d'un achat ?"

Exemple 2 — Indépendant, 42 ans, célibataire, 7000 €/mois, apport 120k€, budget 480k€ :
"Un budget de ce niveau ouvre des portes intéressantes, mais la vraie question est l'horizon de détention : en-dessous de 5 ans, les frais d'acquisition ne sont pas amortis et l'opération peut être perdante. Si la mobilité professionnelle est un scénario, privilégiez un secteur avec forte demande locative — ça sécurise la sortie. Attention aussi aux copropriétés de petite taille : moins de 10 lots = syndic bénévole fréquent, et les décisions de travaux traînent. Un conseiller AQUIZ vérifie ces points et vous aide à construire une stratégie d'achat cohérente avec votre activité."
Économie : 18000
Cliffhanger : "Savez-vous que la taille de la copropriété et le type de syndic impactent directement la valorisation de votre bien à la revente ?"
`,
  modeB: `
EXEMPLES D'ANALYSES DE QUALITÉ (stratégie : diagnostic gratuit, traitement réservé au conseiller) :

Exemple 1 — Appart ancien 350k€, 75011, apport 70k€ :
"Ce secteur est dynamique avec une forte demande, ce qui est rassurant pour la revente. Mais un appartement ancien dans Paris intra-muros mérite une vérification approfondie : les PV d'assemblée générale peuvent révéler un ravalement voté ou des travaux de mise aux normes ascenseur — ce sont des milliers d'euros à venir que le prix affiché ne reflète pas. C'est aussi un argument de négociation puissant que très peu d'acheteurs utilisent. Côté DPE, un classement E ou inférieur impliquerait une rénovation énergétique à moyen terme. Un conseiller AQUIZ épluche ces documents et construit une offre argumentée qui tient compte de la réalité du bien, pas seulement du prix affiché."
Économie : 25000
Cliffhanger : "Les PV d'assemblée générale de cette copropriété pourraient contenir des informations qui changent totalement votre calcul — les avez-vous demandés avant de faire une offre ?"

Exemple 2 — Maison neuve 280k€, zone B2, apport 30k€ :
"En zone B2, le potentiel de plus-value dépend beaucoup des projets d'infrastructure locaux : une future desserte de transport ou un projet d'écoquartier peut valoriser le secteur de façon significative. En neuf, le prix affiché est difficilement négociable — mais les prestations incluses (cuisine, parking, finitions) sont un levier que les acheteurs oublient souvent. Autre point : vérifiez la réputation du promoteur et les délais de livraison réels. Une maison neuve, c'est aussi une garantie décennale — mais encore faut-il que le constructeur soit solide. Un conseiller AQUIZ évalue le programme, négocie les meilleures conditions et vérifie la solidité du promoteur."
Économie : 21000
Cliffhanger : "Avez-vous vérifié les projets d'aménagement prévus dans cette zone — ils peuvent transformer la valeur de ce bien dans les 5 prochaines années ?"
`
}
