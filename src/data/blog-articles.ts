import type { BlogArticle, BlogCategory } from '@/types/blog'

const AQUIZ_AUTHOR = {
  name: 'AQUIZ',
  role: 'Conseil en acquisition immobilière',
}

// ─── ARTICLE 1 — Premier achat immobilier à Paris ───
const premierAchatParis: BlogArticle = {
  slug: 'premier-achat-immobilier-paris-guide',
  title: 'Premier achat immobilier à Paris : le guide complet pour les primo-accédants en 2026',
  excerpt:
    'Acheter un premier appartement à Paris en 2026 : budget, financement, localisation et erreurs à éviter. Le guide complet pour les primo-accédants.',
  category: 'achat',
  tags: ['premier achat', 'Paris', 'primo-accédant', 'budget', 'immobilier', '2026'],
  publishedAt: '2026-01-20',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 10,
  coverImage: '/images/blog/paris-immobilier.jpg',
  coverAlt: 'Vue panoramique des toits de Paris avec la Tour Eiffel en arrière-plan',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: "Calculez votre capacité d'achat à Paris selon vos revenus",
    },
    {
      label: 'Simulateur Mode B',
      href: '/simulateur/mode-b',
      description: 'Vérifiez si un bien parisien rentre dans votre budget',
    },
  ],
  sections: [
    {
      heading: 'Le marché immobilier parisien : un contexte exigeant',
      content:
        "<p>Acheter un premier appartement à Paris représente un objectif important pour de nombreux ménages. Pourtant, entre le niveau élevé des prix, les conditions de financement et la concurrence entre acheteurs, le parcours d'un primo-accédant peut rapidement devenir complexe. Réussir son premier achat immobilier dans la capitale nécessite donc une préparation rigoureuse : comprendre le fonctionnement du marché, définir son budget réel et analyser les risques liés au bien avant de s'engager.</p><p>Le marché immobilier parisien reste l'un des plus chers d'Europe, même si les prix ont connu une légère correction ces dernières années avec la hausse des taux d'intérêt. Selon les données publiées par Notaires du Grand Paris, le prix moyen des appartements anciens à Paris se situe autour de <strong>9 600 à 9 700 euros par mètre carré</strong> en 2025. Cette moyenne masque toutefois de fortes disparités selon les arrondissements. Dans certains quartiers centraux ou très recherchés, les prix dépassent encore 12 000 euros par mètre carré, tandis que certains secteurs plus périphériques restent sous les 9 000 euros par mètre carré. Ces écarts s'expliquent notamment par l'emplacement du bien, la qualité de l'immeuble, la présence d'un ascenseur, l'étage, la luminosité ou encore la présence d'un balcon ou d'une terrasse. En pratique, deux appartements de surface équivalente peuvent afficher des prix très différents selon ces critères.</p><p>Malgré ces niveaux de prix élevés, Paris reste un marché particulièrement attractif. La capitale bénéficie d'une forte concentration d'emplois, d'un réseau de transports dense et d'une attractivité internationale qui soutient la demande immobilière sur le long terme. Pour les primo-accédants, cela signifie qu'il est indispensable de structurer son projet avant même de commencer les visites.</p>",
    },
    {
      heading: 'Définir son budget : la première étape indispensable',
      content:
        "<p>La première étape consiste à déterminer précisément son budget. Cette démarche repose principalement sur les revenus du foyer, l'apport personnel disponible et la capacité d'emprunt. En France, les établissements bancaires appliquent généralement les recommandations du Haut Conseil de Stabilité Financière, qui fixe un <strong>taux d'endettement maximal de 35 % des revenus</strong>, assurance comprise. Concrètement, cela signifie que la mensualité totale du crédit immobilier ne doit pas dépasser environ un tiers des revenus nets du foyer. Les banques analysent également d'autres éléments pour évaluer la solidité d'un dossier : la stabilité professionnelle, l'ancienneté dans l'emploi, la gestion des comptes bancaires et l'épargne restante après l'achat.</p>",
    },
    {
      heading: "L'apport personnel et les frais annexes",
      content:
        "<p>L'apport personnel joue aussi un rôle déterminant. Dans la plupart des projets immobiliers, les banques attendent un apport permettant au minimum de couvrir les frais liés à l'acquisition. Le prix du bien ne représente en effet qu'une partie du budget total. Dans l'ancien, les frais de notaire représentent généralement entre <strong>7 % et 8 % du prix d'achat</strong>, selon les informations publiées par Service-Public.fr. À ces frais s'ajoutent souvent d'autres dépenses, comme les frais de garantie bancaire (caution ou hypothèque), les frais de dossier de la banque, les frais de déménagement ou encore d'éventuels travaux.</p><p>Les futurs propriétaires doivent également anticiper les charges courantes liées au logement : les charges de copropriété, la taxe foncière et l'entretien du bien. Ces dépenses peuvent représenter plusieurs centaines d'euros par mois et doivent être intégrées dans le calcul du budget global afin d'éviter toute mauvaise surprise.</p>",
    },
    {
      heading: 'Quelle surface pour quel budget à Paris ?',
      content:
        "<p>La surface accessible dépend directement du budget disponible. À titre indicatif, un budget autour de 300 000 à 350 000 euros permet souvent d'acquérir un studio ou un petit deux-pièces dans certains arrondissements. Avec un budget compris entre 400 000 et 500 000 euros, il devient généralement possible de viser un deux-pièces de 30 à 45 m² dans plusieurs quartiers de la capitale.</p><p>Ces estimations restent toutefois indicatives, car l'état du logement, la présence de travaux ou la qualité de l'immeuble peuvent fortement influencer le prix final. Par exemple, un appartement situé dans un immeuble ancien sans ascenseur peut être proposé à un prix inférieur au marché, tandis qu'un bien rénové dans un immeuble de standing peut dépasser largement la moyenne du quartier.</p>",
    },
    {
      heading: "L'importance de la localisation et de l'analyse technique",
      content:
        "<p>Dans l'immobilier, la localisation constitue le premier facteur de valorisation d'un bien. Un appartement situé dans un quartier bien desservi par les transports et disposant de commerces et de services à proximité conserve généralement mieux sa valeur dans le temps. Les analyses de l'INSEE montrent d'ailleurs que l'accessibilité aux transports et aux services constitue l'un des principaux facteurs d'attractivité résidentielle dans les grandes métropoles. Avant de faire une offre d'achat, il est donc essentiel d'analyser l'environnement du bien : proximité du métro ou du RER, présence de commerces, dynamisme du quartier ou encore qualité de l'environnement urbain.</p><p>Un achat immobilier implique également l'analyse de plusieurs documents techniques. Les <strong>procès-verbaux d'assemblée générale</strong> de copropriété permettent par exemple d'identifier les travaux votés dans l'immeuble, les travaux à venir ou l'état financier de la copropriété. Le <strong>diagnostic de performance énergétique (DPE)</strong> constitue également un élément important, car il informe sur la consommation énergétique du logement et peut avoir un impact sur la valeur du bien ou sur les travaux à prévoir. Il est également recommandé d'examiner le montant des charges de copropriété, l'état général des parties communes et l'existence éventuelle de procédures en cours dans la copropriété.</p>",
    },
    {
      heading: 'Les erreurs à éviter et se faire accompagner',
      content:
        "<p>Lors d'un premier achat immobilier, certaines erreurs reviennent régulièrement. Beaucoup d'acheteurs se concentrent uniquement sur le prix du bien sans intégrer les frais annexes dans leur budget global. D'autres surestiment leur capacité d'emprunt ou négligent l'analyse technique du logement. Le coup de cœur peut aussi conduire à prendre une décision trop rapide. Pourtant, un achat immobilier représente souvent l'un des engagements financiers les plus importants d'une vie. Les professionnels du secteur recommandent donc de comparer plusieurs biens et de prendre le temps d'analyser chaque opportunité avant de se positionner.</p><p>Dans un marché aussi compétitif que celui de Paris, être accompagné par un professionnel peut sécuriser le projet. Un expert immobilier peut notamment aider à analyser la cohérence du budget, identifier les biens correspondant réellement aux critères de recherche, vérifier les documents techniques et négocier le prix d'achat. Cette approche permet d'aborder l'acquisition avec une vision plus rationnelle et stratégique.</p><p>Acheter son premier appartement à Paris reste un projet exigeant, mais il demeure réalisable avec une préparation sérieuse. Avant de commencer les visites, il est essentiel de définir un budget réaliste, sécuriser son financement, identifier les quartiers compatibles avec son projet et analyser les caractéristiques techniques du bien. Une recherche bien structurée permet d'augmenter significativement les chances de réussir son premier achat immobilier dans la capitale et de transformer ce projet en véritable décision patrimoniale sur le long terme.</p>",
    },
  ],
}

// ─── ARTICLE 2 — 10 erreurs primo-accédants ───
const erreursPrimoAccedant: BlogArticle = {
  slug: 'primo-accedant-10-erreurs-a-eviter',
  title: 'Primo-accédant : les 10 erreurs à éviter lors d\'un premier achat immobilier',
  excerpt:
    'Budget mal défini, frais sous-estimés, coup de cœur... Découvrez les 10 erreurs les plus fréquentes des primo-accédants et nos conseils pour les éviter.',
  category: 'achat',
  tags: ['primo-accédant', 'erreurs', 'premier achat', 'conseils', 'financement'],
  publishedAt: '2026-01-25',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 9,
  coverImage: '/images/blog/primo-accedant-erreurs.jpg',
  coverAlt: 'Jeune couple consultant des documents immobiliers avec un air préoccupé',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: "Définissez votre budget réel avant de chercher",
    },
    {
      label: 'Simulateur Mode B',
      href: '/simulateur/mode-b',
      description: 'Vérifiez la faisabilité d\'un bien avant de vous engager',
    },
  ],
  sections: [
    {
      heading: 'Introduction : un projet qui nécessite méthode et recul',
      content:
        "<p>Devenir propriétaire pour la première fois est une étape importante dans un parcours de vie. Pourtant, un premier achat immobilier reste souvent un projet complexe, qui combine décisions financières, choix de localisation et analyse technique du bien. Pour les primo-accédants, certaines erreurs reviennent fréquemment et peuvent avoir un impact important sur la réussite du projet.</p><p>Entre la préparation du financement, la sélection du bien et l'analyse du marché, il est donc essentiel d'aborder un premier achat avec méthode et recul. Voici les dix erreurs les plus fréquentes commises par les primo-accédants et les conseils pour les éviter.</p>",
    },
    {
      heading: 'Erreurs 1 à 4 : le budget et le financement',
      content:
        "<p>La première erreur consiste à <strong>ne pas définir précisément son budget avant de commencer les visites</strong>. Beaucoup d'acheteurs débutent leur recherche en consultant les annonces immobilières sans avoir évalué leur capacité d'emprunt. Pourtant, les banques appliquent aujourd'hui des critères stricts pour l'octroi des crédits immobiliers. En France, les recommandations du Haut Conseil de Stabilité Financière limitent généralement le taux d'endettement à <strong>35 % des revenus</strong> du ménage, assurance comprise, avec une durée maximale d'emprunt de 25 ans dans la plupart des cas. Sans une estimation claire du budget, les acheteurs risquent donc de cibler des biens qu'ils ne pourront finalement pas financer.</p><p>Une autre erreur fréquente consiste à <strong>sous-estimer le coût total du projet immobilier</strong>. De nombreux primo-accédants se concentrent uniquement sur le prix du logement et la mensualité du crédit. Or un achat immobilier implique plusieurs frais supplémentaires. Dans l'ancien, les frais de notaire représentent généralement entre <strong>7 % et 8 % du prix</strong> du bien, auxquels s'ajoutent les frais de garantie bancaire, les frais de dossier ou encore les éventuels travaux. Ne pas anticiper ces dépenses peut rapidement déséquilibrer le budget du ménage après l'acquisition.</p><p>La troisième erreur consiste à <strong>maximiser sa capacité d'emprunt sans conserver de marge financière</strong>. Certains acheteurs cherchent à emprunter le montant maximum possible pour accéder à un logement plus grand ou mieux situé. Cette stratégie peut fragiliser le projet sur le long terme. Les spécialistes de l'immobilier rappellent qu'un financement trop tendu laisse peu de marge en cas d'imprévu, comme une hausse des charges, des travaux ou un changement de situation professionnelle.</p><p>La quatrième erreur concerne <strong>l'utilisation de l'apport personnel</strong>. Beaucoup de primo-accédants mobilisent l'intégralité de leur épargne pour augmenter leur capacité d'achat. Pourtant, il est souvent conseillé de conserver une réserve financière après l'achat afin de faire face aux imprévus liés au logement ou à la vie quotidienne.</p>",
    },
    {
      heading: 'Erreurs 5 à 7 : le choix du bien',
      content:
        "<p>Une cinquième erreur consiste à <strong>négliger l'importance de l'emplacement du bien</strong>. Dans l'immobilier, la localisation reste l'un des principaux facteurs de valorisation d'un logement. Un bien situé dans un quartier mal desservi par les transports ou éloigné des services peut être plus difficile à revendre ou à louer. Les professionnels recommandent donc d'étudier attentivement l'environnement du bien : accessibilité, commerces, écoles, projets urbains et qualité de vie du quartier.</p><p>La sixième erreur consiste à <strong>acheter un bien uniquement sur un coup de cœur</strong>. L'émotion joue souvent un rôle important lors d'une première acquisition. Pourtant, les experts du secteur rappellent qu'il est essentiel de conserver une approche rationnelle et d'anticiper l'évolution de sa situation personnelle ou professionnelle. Un logement adapté aujourd'hui doit aussi rester cohérent dans plusieurs années.</p><p>La septième erreur concerne la <strong>mauvaise analyse de l'état du bien et de la copropriété</strong>. Certains acheteurs négligent les documents techniques comme les diagnostics immobiliers ou les procès-verbaux d'assemblée générale de copropriété. Pourtant, ces documents peuvent révéler la présence de travaux importants, des problèmes structurels ou des dépenses futures à anticiper.</p>",
    },
    {
      heading: 'Erreurs 8 à 10 : financement, travaux et accompagnement',
      content:
        "<p>La huitième erreur consiste à <strong>ne pas comparer plusieurs solutions de financement</strong>. Se contenter de l'offre de sa banque historique peut parfois conduire à payer un crédit plus cher que nécessaire. Les conditions de prêt, taux d'intérêt, assurance emprunteur, frais de dossier varient d'un établissement à l'autre. Comparer plusieurs offres permet donc souvent d'optimiser le coût global du financement.</p><p>La neuvième erreur consiste à <strong>sous-estimer le coût des travaux</strong>. Dans de nombreux cas, les acheteurs envisagent des rénovations après l'acquisition sans mesurer précisément leur coût réel. Cuisine, salle de bain, rénovation énergétique ou remise aux normes peuvent rapidement représenter plusieurs dizaines de milliers d'euros.</p><p>Enfin, la dixième erreur consiste à <strong>réaliser son premier achat immobilier sans accompagnement</strong>. Dans un marché immobilier parfois complexe, être accompagné par un professionnel permet souvent d'éviter certaines erreurs. Un spécialiste de l'immobilier peut aider à analyser le marché, vérifier les documents techniques et négocier le prix d'achat.</p><p>Réussir son premier achat immobilier repose donc sur une préparation solide et une analyse rigoureuse. Définir un budget réaliste, étudier le marché, vérifier les caractéristiques du bien et anticiper les coûts permettent d'éviter la plupart des erreurs courantes. Pour les primo-accédants, cette démarche structurée transforme un projet parfois stressant en véritable décision patrimoniale sur le long terme.</p>",
    },
  ],
}

// ─── ARTICLE 3 — Checklist déménagement ───
const checklistDemenagement: BlogArticle = {
  slug: 'checklist-demenagement-guide-pratique',
  title: 'Checklist déménagement : le guide pratique pour ne rien oublier',
  excerpt:
    'De la planification au jour J, suivez notre checklist complète pour organiser votre déménagement sans stress et sans oubli.',
  category: 'guides',
  tags: ['déménagement', 'checklist', 'guide pratique', 'organisation', 'logement'],
  publishedAt: '2026-02-01',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 8,
  coverImage: '/images/blog/visite-appartement.jpg',
  coverAlt: 'Intérieur lumineux d\'un appartement vide prêt pour un emménagement',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: 'Prévoyez le budget déménagement dans votre projet immobilier',
    },
  ],
  sections: [
    {
      heading: 'Anticiper et planifier le déménagement',
      content:
        "<p>Un déménagement représente souvent une étape importante dans une vie. Qu'il s'agisse d'un changement de logement après un achat immobilier, d'une mutation professionnelle ou d'un nouveau projet de vie, cette transition nécessite une organisation rigoureuse. Entre les démarches administratives, la préparation des cartons et l'installation dans le nouveau logement, les tâches à accomplir sont nombreuses et peuvent rapidement devenir source de stress si elles ne sont pas anticipées.</p><p>Pour éviter les oublis et faciliter cette période de transition, il est généralement recommandé de préparer son déménagement <strong>entre un et trois mois à l'avance</strong>. Cette anticipation permet de planifier les démarches administratives, d'organiser la logistique et de limiter les imprévus le jour du départ. Selon plusieurs guides pratiques consacrés à la mobilité résidentielle, une bonne organisation permet non seulement de réduire le stress, mais aussi de mieux maîtriser le coût global du déménagement.</p><p>La première étape consiste à planifier la date du déménagement et à organiser les formalités liées à l'ancien logement. Pour les locataires, cela implique notamment d'envoyer un préavis de départ au propriétaire ou à l'agence immobilière. En France, le délai standard est généralement de <strong>trois mois</strong> pour un logement vide, bien qu'il puisse être réduit à un mois dans certaines situations, notamment dans les zones dites tendues ou dans certains cas particuliers prévus par la réglementation. Anticiper ce délai est essentiel pour éviter des frais supplémentaires ou un chevauchement entre deux loyers.</p>",
    },
    {
      heading: 'Organiser la logistique et faire le tri',
      content:
        "<p>À ce stade, il est également conseillé de déterminer la manière dont le déménagement sera réalisé. Certains ménages choisissent de déménager par leurs propres moyens, tandis que d'autres préfèrent faire appel à une entreprise spécialisée. Dans ce second cas, il est recommandé de <strong>demander plusieurs devis</strong> afin de comparer les prestations et les tarifs proposés par les différents professionnels. Les prix peuvent varier selon plusieurs critères, notamment la distance, le volume des meubles et les services supplémentaires comme l'emballage des objets fragiles.</p><p>Un déménagement représente aussi une excellente occasion de faire le tri dans ses affaires. Au fil des années, de nombreux objets inutiles s'accumulent dans les logements. Avant de commencer à préparer les cartons, il est donc conseillé de réduire le volume des affaires à transporter. Cette étape permet de simplifier l'organisation du déménagement et peut également diminuer les coûts si l'on fait appel à un professionnel. Les objets peuvent être répartis en trois catégories : <strong>ceux à conserver, ceux à vendre ou donner, et ceux à jeter</strong>. Cette méthode permet d'éviter de transporter des objets dont on n'a plus réellement besoin.</p>",
    },
    {
      heading: 'Préparer les cartons efficacement',
      content:
        "<p>La préparation des cartons constitue l'une des étapes les plus visibles du déménagement. Pour éviter la précipitation, il est préférable de commencer plusieurs semaines à l'avance en emballant d'abord les objets les moins utilisés, comme les livres, les décorations ou certains vêtements hors saison. Les cartons doivent être <strong>clairement étiquetés</strong> avec leur contenu et la pièce de destination dans le nouveau logement. Cette organisation facilite considérablement le déballage et l'installation. Les objets fragiles doivent être protégés avec du papier bulle ou du papier journal, et il est conseillé de ne pas surcharger les cartons afin d'éviter les accidents lors du transport.</p>",
    },
    {
      heading: 'Les démarches administratives',
      content:
        "<p>Un déménagement implique également plusieurs démarches administratives importantes. Il est notamment nécessaire de signaler son changement d'adresse auprès de différents organismes et fournisseurs. Les principaux services à prévenir sont généralement les fournisseurs d'énergie, les opérateurs internet et téléphonie, les compagnies d'assurance, les établissements bancaires et certains organismes administratifs. Aujourd'hui, une partie de ces démarches peut être réalisée en ligne, ce qui facilite considérablement la gestion du changement d'adresse.</p>",
    },
    {
      heading: 'Le jour J et l\'installation',
      content:
        "<p>À l'approche du jour du déménagement, certaines vérifications doivent également être effectuées. Avant de quitter l'ancien logement, il est recommandé de <strong>relever les compteurs</strong> d'électricité, d'eau et de gaz afin de transmettre les index aux fournisseurs d'énergie. Cela permet d'éviter toute erreur de facturation. Il est également important de vérifier que toutes les pièces du logement ont été vidées : placards, cave, grenier ou boîte aux lettres. Lors de l'état des lieux de sortie, toutes les clés doivent être remises au propriétaire ou à l'agence immobilière.</p><p>Une fois installé dans le nouveau logement, plusieurs démarches restent encore à effectuer. Les nouveaux occupants doivent notamment vérifier le bon fonctionnement des installations essentielles comme l'électricité, l'eau chaude ou le chauffage. Il est également conseillé de s'assurer que les contrats d'énergie et d'internet sont bien activés afin d'éviter toute interruption de service. Dans certains cas, il peut également être nécessaire de mettre à jour certains documents administratifs, comme la carte grise du véhicule ou l'adresse auprès de certaines administrations.</p><p>Un déménagement peut rapidement devenir une source de stress lorsque les différentes étapes ne sont pas anticipées. À l'inverse, une organisation méthodique permet de rendre cette transition beaucoup plus sereine. Les spécialistes du logement rappellent que la réussite d'un déménagement repose principalement sur trois éléments : <strong>l'anticipation, l'organisation et la gestion du budget</strong>. En suivant une checklist claire et en planifiant les différentes étapes plusieurs semaines à l'avance, il devient possible de limiter les imprévus et de faciliter l'installation dans un nouveau logement. Un déménagement bien préparé permet ainsi de transformer une étape souvent perçue comme contraignante en un nouveau départ plus serein.</p>",
    },
  ],
}

// ─── ARTICLE 4 — Reste à vivre ───
const resteAVivre: BlogArticle = {
  slug: 'reste-a-vivre-immobilier-calcul-importance',
  title: 'Reste à vivre : pourquoi c\'est aussi important que le taux d\'endettement ?',
  excerpt:
    'Le reste à vivre est un critère décisif pour les banques. Découvrez comment le calculer, les seuils de référence et comment l\'améliorer pour votre projet immobilier.',
  category: 'simulation',
  tags: ['reste à vivre', 'taux d\'endettement', 'capacité d\'emprunt', 'banque', 'financement'],
  publishedAt: '2026-02-05',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 9,
  coverImage: '/images/blog/reste-a-vivre.jpg',
  coverAlt: 'Calcul de budget familial avec une calculatrice et des documents financiers',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: "Calculez votre reste à vivre et votre capacité d'emprunt",
    },
    {
      label: 'Simulateur Mode B',
      href: '/simulateur/mode-b',
      description: 'Vérifiez que votre reste à vivre est suffisant pour ce bien',
    },
  ],
  sections: [
    {
      heading: 'Qu\'est-ce que le reste à vivre ?',
      content:
        "<p>Le reste à vivre est l'un des indicateurs les plus importants dans l'analyse d'un projet immobilier. Pourtant, de nombreux acheteurs se concentrent uniquement sur le taux d'endettement lorsqu'ils évaluent leur capacité d'emprunt. En réalité, les banques ne se limitent pas à ce seul critère : elles analysent également la somme d'argent qu'il reste à un ménage une fois toutes ses charges payées. Cette notion, appelée reste à vivre, permet d'évaluer si un emprunteur pourra rembourser son crédit immobilier tout en conservant un niveau de vie équilibré. Dans un contexte où l'accès au crédit immobilier est devenu plus exigeant, comprendre cet indicateur est essentiel pour réussir son projet d'achat.</p><p>Le reste à vivre correspond au <strong>montant disponible chaque mois après le paiement de l'ensemble des charges fixes</strong> du foyer. Concrètement, il s'agit de l'argent restant une fois que les dépenses incompressibles ont été déduites des revenus. Ces charges comprennent généralement la mensualité du crédit immobilier, les autres crédits éventuels (automobile ou consommation), les impôts, les assurances, mais aussi certaines dépenses récurrentes comme les abonnements ou les charges énergétiques. Le montant obtenu représente alors le budget disponible pour les dépenses du quotidien : alimentation, transport, loisirs, épargne ou imprévus. Selon plusieurs spécialistes du financement immobilier comme Pretto ou Meilleurtaux, les banques utilisent cet indicateur pour vérifier qu'un emprunteur pourra assumer ses engagements financiers sans mettre en péril son équilibre budgétaire.</p>",
    },
    {
      heading: 'La relation entre reste à vivre et taux d\'endettement',
      content:
        "<p>Dans l'analyse d'un dossier de financement, le reste à vivre est étudié en parallèle du taux d'endettement. Ce dernier correspond à la part des revenus consacrée au remboursement des crédits. En France, les recommandations du Haut Conseil de stabilité financière (HCSF) fixent généralement un plafond de <strong>35 % d'endettement</strong> assurance incluse. Cependant, respecter ce seuil ne garantit pas automatiquement l'obtention d'un prêt. <strong>Une banque peut refuser un financement si le reste à vivre est jugé trop faible</strong>, même lorsque le taux d'endettement est conforme. L'objectif des établissements bancaires est de s'assurer que le ménage conservera une capacité financière suffisante pour faire face aux dépenses courantes et aux aléas de la vie pendant toute la durée du prêt, qui peut s'étendre sur vingt à vingt-cinq ans.</p>",
    },
    {
      heading: 'Comment calculer son reste à vivre ?',
      content:
        "<p>Le calcul du reste à vivre est relativement simple. Il consiste à soustraire les charges fixes mensuelles du total des revenus nets du foyer. Les revenus pris en compte incluent généralement les salaires nets, les revenus indépendants stabilisés, les pensions ou retraites, ainsi que certains revenus locatifs. Dans ce dernier cas, les banques appliquent souvent une décote de sécurité et ne retiennent qu'environ <strong>70 % des loyers perçus</strong>. Une fois ces revenus additionnés, toutes les charges récurrentes sont déduites pour obtenir le reste à vivre réel. Ce calcul permet aux banques d'évaluer la capacité d'un ménage à financer ses dépenses quotidiennes après l'achat immobilier.</p><p>Prenons un exemple concret. Un couple dispose de revenus nets mensuels de 3 200 euros. Après l'achat immobilier, la mensualité du crédit s'élève à 950 euros. Le ménage rembourse également un crédit automobile de 150 euros et supporte environ 250 euros de charges fixes supplémentaires liées aux assurances et aux impôts. Le total des charges atteint donc 1 350 euros. En soustrayant ces dépenses aux revenus mensuels, le reste à vivre s'établit à <strong>1 850 euros</strong>. Cette somme correspond au budget disponible pour vivre chaque mois. Plus ce montant est élevé, plus la banque sera rassurée quant à la solvabilité du foyer.</p>",
    },
    {
      heading: 'Les seuils de référence des banques',
      content:
        "<p>Contrairement au taux d'endettement, il n'existe pas de seuil légal unique pour le reste à vivre. Chaque banque applique ses propres critères d'analyse en fonction du profil de l'emprunteur et de la composition du foyer. Néanmoins, certaines références sont souvent observées dans le secteur bancaire. Pour une personne seule, les établissements financiers considèrent généralement qu'un reste à vivre situé entre <strong>700 et 1 000 euros</strong> constitue un minimum raisonnable. Pour un couple, ce montant se situe plutôt entre <strong>1 200 et 1 500 euros</strong>, avec un complément supplémentaire pour chaque enfant à charge.</p><p>Ces valeurs restent indicatives et peuvent varier selon le niveau de revenus ou le coût de la vie dans la région. Dans les grandes métropoles comme Paris ou Lyon, où les dépenses quotidiennes sont plus élevées, les banques peuvent exiger un reste à vivre plus important afin de sécuriser le financement.</p>",
    },
    {
      heading: 'Les erreurs fréquentes à éviter',
      content:
        "<p>Plusieurs erreurs sont fréquemment commises par les acheteurs lorsqu'ils évaluent leur reste à vivre. La première consiste à confondre cet indicateur avec le taux d'endettement. Le taux d'endettement est exprimé en pourcentage des revenus, alors que le reste à vivre correspond à un montant concret en euros. Une autre erreur consiste à sous-estimer certaines charges du quotidien. Les dépenses d'assurance, les abonnements ou encore les frais de transport peuvent représenter une part importante du budget et doivent être intégrés dans le calcul. Enfin, certains emprunteurs oublient d'anticiper les évolutions possibles de leur situation financière, comme un changement professionnel, un congé parental ou une baisse de revenus à long terme.</p>",
    },
    {
      heading: 'Comment améliorer son reste à vivre ?',
      content:
        "<p>Il est toutefois possible d'améliorer son reste à vivre avant de déposer un dossier de financement. La première stratégie consiste à réduire ses charges fixes, par exemple en soldant certains crédits à la consommation ou en renégociant certains contrats d'assurance. Une autre approche consiste à augmenter ses revenus, notamment grâce à des revenus locatifs ou à une évolution salariale. Enfin, l'ajustement du projet immobilier peut également jouer un rôle important. Allonger la durée du prêt, augmenter l'apport personnel ou réduire le montant emprunté permet souvent d'abaisser la mensualité du crédit et d'améliorer mécaniquement le reste à vivre.</p><p>Au-delà du simple critère bancaire, le reste à vivre constitue un véritable outil de gestion financière pour les particuliers. Il permet de s'assurer que le projet immobilier reste compatible avec le budget du foyer et d'éviter une situation de tension financière sur le long terme. Dans un contexte marqué par la remontée des taux d'intérêt et par une vigilance accrue des banques, analyser son reste à vivre est devenu une étape incontournable pour préparer un achat immobilier.</p>",
    },
  ],
}

// ─── ARTICLE 5 — Apport personnel ───
const apportPersonnel: BlogArticle = {
  slug: 'apport-personnel-combien-faut-il-pour-acheter',
  title: 'Apport personnel : combien faut-il vraiment pour acheter en 2026 ?',
  excerpt:
    'Quel apport prévoir pour acheter un bien immobilier ? Montant minimum, apport idéal, données du marché et solutions pour acheter sans apport.',
  category: 'financement',
  tags: ['apport personnel', 'épargne', 'financement', 'crédit immobilier', 'premier achat'],
  publishedAt: '2026-02-10',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 8,
  coverImage: '/images/blog/apport-personnel.jpg',
  coverAlt: 'Tirelire et pièces de monnaie symbolisant l\'épargne pour un apport immobilier',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: "Intégrez votre apport dans le calcul de votre capacité d'achat",
    },
    {
      label: 'Simulateur Mode B',
      href: '/simulateur/mode-b',
      description: "Testez l'impact de votre apport sur votre projet",
    },
  ],
  sections: [
    {
      heading: "L'apport personnel : un levier essentiel",
      content:
        "<p>Acheter un bien immobilier implique presque toujours de disposer d'un apport personnel, c'est-à-dire une somme d'argent que l'acheteur investit dans son projet sans recourir à un crédit bancaire. Cet apport provient généralement de l'épargne, d'une donation familiale, d'un héritage ou encore de la revente d'un bien immobilier. Dans le financement d'un achat immobilier, l'apport joue un rôle déterminant car il rassure la banque et permet de réduire le montant du prêt à accorder. <strong>Plus l'apport est important, plus le dossier est solide</strong> et plus les conditions d'emprunt peuvent être avantageuses. Comprendre combien d'apport prévoir et comment il influence l'accès au crédit est donc essentiel pour réussir son projet immobilier.</p>",
    },
    {
      heading: 'Quel montant minimum ?',
      content:
        "<p>Dans la majorité des cas, les banques demandent un <strong>apport minimum d'environ 10 %</strong> du montant total du projet immobilier. Cette somme sert principalement à couvrir les frais annexes liés à l'acquisition, notamment les frais de notaire, les frais de garantie du prêt ou encore les frais de dossier bancaire. Par exemple, pour l'achat d'un bien à 250 000 euros, un apport minimum d'environ 25 000 euros est généralement nécessaire afin de couvrir ces frais sans les intégrer au crédit.</p><p>Cependant, ce minimum ne correspond pas toujours à la réalité du marché. Dans la pratique, les banques privilégient souvent des profils disposant d'un apport plus conséquent. De nombreux experts du financement immobilier estiment qu'un apport situé <strong>entre 10 % et 20 %</strong> du prix du bien constitue aujourd'hui la norme pour obtenir de bonnes conditions de crédit.</p>",
    },
    {
      heading: "L'apport idéal : entre 20 % et 30 %",
      content:
        "<p>Un apport plus élevé présente plusieurs avantages. D'abord, il permet de réduire le montant emprunté et donc les mensualités du crédit. Ensuite, il rassure l'établissement bancaire sur la capacité de gestion financière de l'emprunteur. Enfin, il peut permettre d'obtenir un taux d'intérêt plus avantageux ou de négocier certaines conditions du prêt. Pour bénéficier des conditions de financement les plus favorables, certains spécialistes recommandent même un apport situé entre <strong>20 % et 30 %</strong> du prix du bien, ce qui diminue fortement le risque perçu par la banque et améliore le pouvoir de négociation de l'acheteur.</p>",
    },
    {
      heading: 'Les données du marché en 2025',
      content:
        "<p>Les données récentes du marché immobilier confirment l'importance de l'apport personnel dans les projets d'achat. En 2025, l'apport moyen des primo-accédants en France atteint environ <strong>57 844 euros</strong> pour un bien moyen de 254 513 euros, soit près de 22,7 % du prix d'achat. Pour les secundo-accédants, l'apport moyen est encore plus élevé et dépasse souvent 80 000 euros.</p><p>Dans les grandes métropoles, le niveau d'apport nécessaire peut être encore plus important en raison des prix immobiliers élevés. Par exemple, certaines études montrent qu'en 2025 l'apport moyen mobilisé par les acheteurs peut dépasser <strong>130 000 euros à Paris</strong>, ce qui représente souvent plus d'une année complète de revenus pour un ménage moyen.</p>",
    },
    {
      heading: 'Acheter sans apport : est-ce possible ?',
      content:
        "<p>Il est toutefois important de rappeler que l'apport personnel n'est pas toujours obligatoire dans tous les cas. Certaines banques peuvent accepter de financer un projet sans apport, notamment pour des profils très solides : jeunes cadres à fort potentiel, fonctionnaires ou emprunteurs disposant d'une stabilité professionnelle importante. Dans ces situations, la banque peut proposer un <strong>financement à 100 %, voire 110 %</strong>, couvrant à la fois le prix du bien et les frais annexes. Cependant, ces dossiers restent plus difficiles à obtenir et nécessitent généralement un profil financier particulièrement sécurisé.</p>",
    },
    {
      heading: 'Comment constituer son apport ?',
      content:
        "<p>Plusieurs sources peuvent être utilisées pour constituer un apport personnel. La plus courante reste l'épargne accumulée sur des livrets ou des placements financiers. Les donations familiales jouent également un rôle croissant dans l'accès à la propriété, notamment pour les jeunes acheteurs dans les grandes villes. Les héritages, la participation salariale ou encore la revente d'un premier bien immobilier peuvent également servir à financer l'apport. Dans certains cas, des dispositifs publics comme le prêt à taux zéro peuvent compléter le financement et réduire le montant à emprunter pour les primo-accédants.</p><p>Au-delà de son rôle financier, l'apport personnel constitue un véritable levier stratégique dans un projet immobilier. Il permet de renforcer la crédibilité du dossier auprès des banques, d'améliorer la capacité d'emprunt et de réduire le coût total du crédit. Un apport élevé peut également offrir davantage de marge de négociation lors de l'achat du bien, notamment dans un marché où les vendeurs privilégient les acheteurs disposant d'un financement sécurisé.</p><p>Dans un contexte où les conditions d'accès au crédit immobilier restent encadrées par des règles strictes, notamment un taux d'endettement généralement limité à 35 % des revenus et une durée maximale de prêt autour de 25 ans, disposer d'un apport solide reste un facteur déterminant pour concrétiser son projet immobilier.</p>",
    },
  ],
}

// ─── ARTICLE 6 — Marché immobilier 2026 ───
const marcheImmobilier2026: BlogArticle = {
  slug: 'marche-immobilier-2026-tendances-prix-regions',
  title: 'Marché immobilier 2026 : tendances, prix et perspectives par région',
  excerpt:
    'Analyse du marché immobilier français en 2026 : reprise modérée, fragmentation géographique, impact du DPE et conditions de financement.',
  category: 'marche',
  tags: ['marché immobilier', 'prix immobilier', 'tendances', 'régions', 'DPE', '2026'],
  publishedAt: '2026-02-15',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 10,
  coverImage: '/images/blog/marche-immobilier-france.jpg',
  coverAlt: 'Vue aérienne de maisons représentant le marché immobilier français',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: 'Estimez votre capacité d\'achat selon votre région',
    },
    {
      label: 'Carte des prix',
      href: '/carte',
      description: 'Explorez les prix au m² par ville sur la carte interactive',
    },
  ],
  sections: [
    {
      heading: 'Une reprise modérée au niveau national',
      content:
        "<p>Le marché immobilier français en 2026 entre dans une nouvelle phase après plusieurs années de turbulences liées à la hausse des taux d'intérêt, à l'inflation et à la baisse du pouvoir d'achat immobilier. Après le ralentissement observé entre 2022 et 2024, l'année 2025 a marqué un début de stabilisation, et 2026 confirme progressivement un retour à l'équilibre. Les professionnels du secteur parlent désormais d'une reprise prudente, caractérisée par une activité qui redémarre progressivement, des prix relativement stables et des dynamiques très différentes selon les régions. Comprendre ces tendances est essentiel pour les acheteurs, les investisseurs et les primo-accédants qui souhaitent se positionner sur le marché immobilier dans les prochaines années.</p><p>Au niveau national, les indicateurs montrent une reprise modérée de l'activité. Après une forte baisse des transactions pendant la crise immobilière récente, le volume des ventes repart progressivement à la hausse. Environ <strong>940 000 transactions immobilières</strong> sont attendues en 2026, ce qui confirme un redémarrage du marché même si celui-ci reste plus prudent qu'avant 2022. Les prix suivent une trajectoire similaire : après une période de correction, ils se stabilisent et devraient connaître une légère progression comprise entre <strong>+1 % et +3 %</strong> en moyenne en France, selon plusieurs observatoires immobiliers. Cette évolution marque la fin de la phase de baisse et l'entrée dans un cycle plus équilibré, où les vendeurs et les acheteurs retrouvent progressivement un terrain d'entente sur les prix.</p>",
    },
    {
      heading: 'Une forte fragmentation géographique',
      content:
        "<p>Cependant, cette moyenne nationale masque des écarts très importants entre les territoires. En 2026, le marché immobilier français se caractérise avant tout par une <strong>forte fragmentation géographique</strong>. Certaines métropoles continuent de progresser tandis que d'autres zones connaissent une stagnation ou des ajustements. Par exemple, les prix immobiliers progressent en moyenne de 1,6 % sur un an, avec des variations selon les villes : Paris enregistre une hausse d'environ 2,9 %, alors que d'autres grandes villes comme Bordeaux, Marseille, Toulouse ou Montpellier affichent des évolutions plus modérées. Cette dynamique reflète un marché désormais beaucoup plus localisé où les facteurs économiques, démographiques et urbains influencent fortement les prix.</p>",
    },
    {
      heading: 'La montée en puissance des villes moyennes',
      content:
        "<p>L'une des tendances majeures du marché immobilier en 2026 est la montée en puissance des villes moyennes et des territoires régionaux. Depuis la pandémie et l'essor du télétravail, de nombreux ménages cherchent davantage d'espace, de qualité de vie et de nature. Cette évolution des modes de vie se traduit par une hausse de la demande pour les maisons individuelles et les biens situés en périphérie des grandes villes ou dans des villes intermédiaires. Les données montrent par exemple que <strong>64 % des acheteurs</strong> privilégient désormais un logement avec un extérieur, ce qui explique l'attrait croissant pour les régions et les zones périurbaines. Dans plusieurs territoires, notamment dans l'ouest et le sud de la France, les prix immobiliers progressent même plus rapidement que dans les grandes métropoles.</p>",
    },
    {
      heading: 'Les grandes villes : vers un marché plus normalisé',
      content:
        "<p>Dans le même temps, les grandes villes restent des marchés immobiliers structurants mais leur dynamique évolue. Paris, Lyon ou Bordeaux continuent d'afficher des niveaux de prix élevés, mais la croissance y est désormais plus modérée qu'auparavant. Après plusieurs années de hausse spectaculaire, ces marchés semblent avoir atteint une forme de plateau, avec des acheteurs devenus plus exigeants et plus attentifs à la qualité des biens. Dans certaines zones très tendues, la négociation entre acheteurs et vendeurs redevient même plus fréquente, signe d'un marché qui se normalise.</p>",
    },
    {
      heading: "L'impact du DPE sur la valorisation des biens",
      content:
        "<p>Une autre transformation importante du marché immobilier en 2026 concerne l'impact du diagnostic de performance énergétique (DPE). Les critères environnementaux prennent désormais une place centrale dans la valorisation des biens immobiliers. Les logements les plus performants sur le plan énergétique bénéficient d'une <strong>prime de valeur</strong>, tandis que les biens classés F ou G sont de plus en plus difficiles à vendre ou nécessitent d'importants travaux de rénovation. Le marché devient progressivement <strong>bipolaire</strong>, avec d'un côté les biens rénovés et immédiatement habitables, et de l'autre les logements nécessitant des travaux qui subissent souvent une décote. Cette évolution reflète l'impact des politiques publiques visant à améliorer la performance énergétique du parc immobilier français.</p>",
    },
    {
      heading: 'Conditions de financement et contexte économique',
      content:
        "<p>Les conditions de financement jouent également un rôle déterminant dans l'évolution du marché immobilier en 2026. Après une forte remontée des taux d'intérêt entre 2022 et 2023, ceux-ci se stabilisent autour de <strong>3 % à 3,5 %</strong> en moyenne, ce qui améliore progressivement la capacité d'emprunt des ménages. Toutefois, les banques restent particulièrement sélectives dans l'octroi des crédits immobiliers, notamment en raison des règles imposées par le Haut Conseil de stabilité financière. Cette prudence limite encore la reprise du marché, même si les projets immobiliers recommencent à se concrétiser progressivement.</p><p>Enfin, l'évolution du marché immobilier en 2026 dépend également du contexte économique global. La confiance des ménages, la croissance économique et l'évolution de l'inflation influencent directement la capacité d'achat immobilier. Les professionnels du secteur estiment ainsi que le marché pourrait continuer à se redresser progressivement dans les prochaines années, avec des volumes de ventes qui devraient se stabiliser autour de <strong>950 000 transactions par an</strong> et des prix qui augmenteraient de manière modérée.</p><p>Dans ce contexte, analyser les tendances du marché immobilier devient essentiel pour prendre les bonnes décisions d'investissement ou d'achat. L'évolution des prix, les dynamiques régionales et les nouvelles exigences énergétiques transforment profondément la manière d'acheter un bien immobilier en France. Chez AQUIZ, l'objectif est justement d'aider les acheteurs à comprendre ces évolutions et à analyser leur capacité d'achat réelle en fonction du marché. En combinant données immobilières, capacité d'emprunt et analyse du reste à vivre, les futurs acquéreurs peuvent mieux anticiper les opportunités et sécuriser leur projet immobilier dans un marché devenu plus sélectif et plus stratégique.</p>",
    },
  ],
}

// ─── ARTICLE 7 — Villes IDF accessibles ───
const villesIdfAccessibles: BlogArticle = {
  slug: 'villes-ile-de-france-accessibles-2026',
  title: 'Les 10 villes les plus accessibles d\'Île-de-France pour acheter en 2026',
  excerpt:
    'Prix, transports, cadre de vie : notre analyse des communes les plus accessibles autour de Paris pour un premier achat immobilier en 2026.',
  category: 'marche',
  tags: ['Île-de-France', 'banlieue', 'villes accessibles', 'prix immobilier', 'premier achat'],
  publishedAt: '2026-02-20',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 9,
  coverImage: '/images/blog/villes-idf-accessibles.jpg',
  coverAlt: 'Maison de banlieue parisienne avec jardin, typique de l\'Île-de-France',
  relatedTools: [
    {
      label: 'Carte des prix',
      href: '/carte',
      description: 'Comparez les prix des villes IDF sur la carte interactive',
    },
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: 'Calculez votre budget pour chaque ville',
    },
  ],
  sections: [
    {
      heading: 'Pourquoi s\'éloigner de Paris ?',
      content:
        "<p>Acheter un bien immobilier en Île-de-France reste un défi pour de nombreux ménages, en particulier pour les primo-accédants. Avec un marché historiquement tendu et des prix élevés dans la capitale, de nombreux acheteurs se tournent vers des communes plus accessibles situées en première ou deuxième couronne. En 2026, cette tendance se confirme : les villes situées autour de Paris attirent de plus en plus d'acquéreurs à la recherche d'un meilleur compromis entre prix immobilier, accessibilité aux transports et qualité de vie. Comprendre quelles villes restent abordables et pourquoi elles gagnent en attractivité est essentiel pour réussir son projet immobilier dans la région.</p><p>Le principal facteur qui pousse les acheteurs à s'éloigner de Paris est évidemment le niveau des prix. En 2026, le prix moyen de l'immobilier dans la capitale avoisine près de <strong>9 800 € par mètre carré</strong>, ce qui rend l'achat très difficile pour une grande partie des ménages, notamment les primo-accédants. À l'échelle de l'Île-de-France, les prix restent plus modérés mais demeurent élevés avec une moyenne autour de <strong>5 600 € par mètre carré</strong>, ce qui illustre l'écart important entre Paris et certaines zones plus accessibles de la région. Dans ce contexte, de nombreuses communes de banlieue deviennent des alternatives particulièrement attractives pour les acheteurs qui souhaitent rester proches de la capitale tout en maîtrisant leur budget.</p>",
    },
    {
      heading: 'Seine-Saint-Denis et Val-d\'Oise : les prix les plus accessibles',
      content:
        "<p>Plusieurs villes situées en petite et grande couronne se distinguent aujourd'hui par des prix nettement plus accessibles. En Seine-Saint-Denis, par exemple, certaines communes comme Drancy, Gagny ou Les Pavillons-sous-Bois proposent des prix autour de <strong>3 300 à 3 600 € par mètre carré</strong>, soit près de trois fois moins que dans certains quartiers parisiens. Ces villes bénéficient en outre d'une amélioration progressive des infrastructures de transport et de l'attractivité économique liée au développement du Grand Paris. Pour les primo-accédants, elles représentent souvent une porte d'entrée vers la propriété dans la région parisienne.</p><p>Dans le Val-d'Oise, la ville de Cergy fait également partie des marchés immobiliers les plus accessibles de la région. On y trouve des appartements anciens autour de <strong>3 000 € par mètre carré</strong>, ce qui permet à de nombreux ménages d'acheter un logement familial pour le prix d'un petit studio parisien. Grâce à la présence d'un pôle universitaire, d'une bonne desserte en transports et d'un bassin d'emploi dynamique, Cergy attire à la fois les primo-accédants, les investisseurs et les étudiants.</p>",
    },
    {
      heading: 'Val-de-Marne et Essonne : des opportunités intéressantes',
      content:
        "<p>Dans le Val-de-Marne, certaines communes offrent également des opportunités intéressantes pour les acheteurs. Des villes comme Limeil-Brévannes ou Thiais affichent par exemple des prix situés autour de <strong>4 000 à 4 600 € par mètre carré</strong>, soit bien en dessous de la moyenne parisienne. Cette relative accessibilité s'explique notamment par une distance légèrement plus importante avec la capitale, mais aussi par des projets urbains récents qui améliorent progressivement l'attractivité de ces territoires.</p><p>L'Essonne constitue également un territoire particulièrement intéressant pour les ménages disposant d'un budget plus limité. Le prix moyen de l'immobilier y tourne autour de <strong>3 000 € par mètre carré</strong>, ce qui en fait l'un des départements les plus abordables de la région parisienne. Des villes comme Évry-Courcouronnes ou Massy attirent ainsi de nombreux acheteurs grâce à leur proximité avec les grands pôles économiques du sud francilien, notamment le plateau de Saclay et ses centres de recherche.</p>",
    },
    {
      heading: 'Les facteurs d\'attractivité au-delà du prix',
      content:
        "<p>Au-delà du prix immobilier, l'accessibilité d'une ville dépend également de plusieurs autres facteurs déterminants. Les transports jouent un rôle central dans le choix des acheteurs. Les communes desservies par le RER, le métro ou les futures lignes du Grand Paris Express gagnent en attractivité car elles permettent de rejoindre rapidement les principaux pôles d'emploi de la région. La présence d'infrastructures, d'écoles, de commerces ou d'espaces verts influence également fortement la demande immobilière.</p><p>L'évolution des modes de vie contribue aussi à transformer les critères de recherche des acheteurs. Depuis la généralisation du télétravail dans certains secteurs, de nombreux ménages privilégient désormais des logements plus spacieux ou situés dans des villes offrant une meilleure qualité de vie. Cette tendance favorise les communes de grande couronne, où les prix restent plus accessibles et où les maisons avec jardin sont plus nombreuses.</p>",
    },
    {
      heading: 'Un marché fragmenté et localisé',
      content:
        "<p>Dans ce contexte, l'Île-de-France devient un marché immobilier de plus en plus <strong>fragmenté et localisé</strong>, où chaque ville possède sa propre dynamique. Certaines communes voient leur attractivité augmenter rapidement grâce à de nouveaux projets de transports ou d'aménagement urbain, tandis que d'autres restent plus abordables mais présentent un potentiel de valorisation intéressant à long terme. Pour les acheteurs, il devient donc essentiel d'analyser non seulement le prix actuel d'un bien immobilier, mais aussi les perspectives de développement du territoire dans lequel il se situe.</p><p>Chez AQUIZ, l'objectif est justement d'aider les futurs acquéreurs à identifier les opportunités immobilières les plus cohérentes avec leur budget et leur capacité d'emprunt. En analysant à la fois les prix du marché, la capacité d'achat et les dynamiques territoriales, il devient possible de repérer des villes accessibles en Île-de-France tout en sécurisant son projet immobilier. Dans une région où les écarts de prix peuvent être considérables d'une commune à l'autre, cette approche permet aux acheteurs de prendre des décisions plus éclairées et d'optimiser leur stratégie d'acquisition.</p>",
    },
  ],
}

// ─── ARTICLE 8 — Compromis de vente ───
const compromisVente: BlogArticle = {
  slug: 'compromis-de-vente-guide-pratique',
  title: 'Compromis de vente : tout comprendre avant de signer',
  excerpt:
    'Le compromis de vente est une étape clé de l\'achat immobilier. Clauses suspensives, délai de rétractation, dépôt de garantie : guide complet.',
  category: 'achat',
  tags: ['compromis de vente', 'achat immobilier', 'clauses suspensives', 'notaire', 'rétractation'],
  publishedAt: '2026-02-25',
  updatedAt: '2026-03-15',
  author: AQUIZ_AUTHOR,
  readingTime: 9,
  coverImage: '/images/blog/compromis-vente.jpg',
  coverAlt: 'Signature d\'un compromis de vente immobilier chez le notaire',
  relatedTools: [
    {
      label: 'Simulateur Mode B',
      href: '/simulateur/mode-b',
      description: 'Vérifiez votre budget avant de signer le compromis',
    },
  ],
  sections: [
    {
      heading: 'Qu\'est-ce qu\'un compromis de vente ?',
      content:
        "<p>Le compromis de vente est une étape clé dans un projet immobilier. Il s'agit d'un avant-contrat signé entre le vendeur et l'acheteur qui formalise leur accord sur la vente d'un bien immobilier, généralement une maison ou un appartement. Concrètement, cet acte permet de fixer les conditions de la transaction avant la signature définitive chez le notaire. Il marque le moment où les deux parties s'engagent juridiquement : le vendeur s'engage à vendre son bien et l'acheteur s'engage à l'acquérir au prix convenu. Dans le droit français, on parle souvent de <strong>promesse synallagmatique de vente</strong>, car l'engagement est réciproque entre les deux parties.</p><p>Le compromis de vente intervient généralement après l'acceptation d'une offre d'achat et constitue la première étape officielle de la transaction immobilière. Son rôle est de sécuriser l'opération en précisant tous les éléments essentiels de la vente : l'identité des parties, la description du bien immobilier, le prix de vente, les modalités de paiement et la date prévue pour la signature de l'acte authentique. Ce document possède une véritable valeur juridique puisqu'il s'agit d'un contrat qui engage les deux parties une fois signé.</p>",
    },
    {
      heading: 'Rédaction et contenu essentiel',
      content:
        "<p>Dans la plupart des transactions immobilières, le compromis de vente est rédigé par un professionnel, généralement un notaire ou un agent immobilier. Il peut cependant être signé directement entre particuliers sous seing privé. Même si cette possibilité existe, il est fortement recommandé de faire appel à un professionnel afin de vérifier la conformité juridique du document et de s'assurer que toutes les mentions obligatoires sont bien présentes. Le notaire joue notamment un rôle essentiel dans la vérification des documents, des diagnostics immobiliers et des informations liées au bien vendu.</p><p>Le compromis de vente contient un certain nombre d'informations indispensables pour sécuriser la transaction. Parmi les éléments essentiels figurent l'identité du vendeur et de l'acheteur, la description précise du bien immobilier, la surface et les caractéristiques du logement, ainsi que le prix de vente et les modalités de paiement. Le document précise également la date limite pour signer l'acte de vente définitif chez le notaire. Cette date correspond généralement à un délai d'environ <strong>trois mois</strong> après la signature du compromis, ce qui laisse le temps de réaliser les démarches administratives nécessaires et d'obtenir le financement bancaire.</p>",
    },
    {
      heading: 'Le dépôt de garantie',
      content:
        "<p>Lors de la signature du compromis de vente, il est fréquent que l'acheteur verse un <strong>dépôt de garantie</strong>, aussi appelé acompte. Ce montant représente généralement entre <strong>5 % et 10 %</strong> du prix du bien immobilier. Cette somme est conservée par le notaire ou l'agent immobilier et sera déduite du prix final lors de la signature de l'acte authentique. Le dépôt de garantie constitue une preuve de l'engagement de l'acheteur dans la transaction et permet de sécuriser la vente pour le vendeur.</p>",
    },
    {
      heading: 'Les clauses suspensives',
      content:
        "<p>Le compromis de vente inclut également ce que l'on appelle des <strong>clauses suspensives</strong>, qui jouent un rôle central dans la protection des deux parties. Ces clauses prévoient que la vente ne sera définitive que si certaines conditions sont remplies. La clause la plus fréquente concerne l'obtention d'un crédit immobilier par l'acheteur. Si la banque refuse le financement dans les délais prévus, la vente peut être annulée et l'acompte est alors intégralement restitué à l'acquéreur. D'autres conditions suspensives peuvent également être mentionnées, comme l'absence de servitude particulière, la non-préemption par une collectivité ou encore l'obtention d'un permis de construire dans certains cas.</p>",
    },
    {
      heading: 'Le délai de rétractation et les documents obligatoires',
      content:
        "<p>La loi protège également l'acheteur grâce à un <strong>délai de rétractation de 10 jours</strong> à compter de la réception du compromis signé. Durant cette période, l'acquéreur peut renoncer à l'achat sans avoir à justifier sa décision et sans pénalité financière. Passé ce délai, l'engagement devient plus ferme et un désistement peut entraîner la perte du dépôt de garantie, sauf si une clause suspensive prévue dans le compromis se réalise.</p><p>Avant la signature du compromis de vente, plusieurs documents doivent être fournis à l'acheteur afin de garantir une transparence totale sur le bien immobilier. Le vendeur doit notamment remettre un <strong>dossier de diagnostics techniques</strong> comprenant par exemple le diagnostic de performance énergétique, l'état des installations électriques ou encore l'état des risques naturels. Lorsque le bien est situé en copropriété, des documents supplémentaires doivent également être fournis afin d'informer l'acheteur sur l'organisation et la situation financière de l'immeuble.</p>",
    },
    {
      heading: 'Du compromis à l\'acte authentique',
      content:
        "<p>Une fois le compromis de vente signé et le délai de rétractation écoulé, la transaction entre dans une phase administrative durant laquelle plusieurs démarches doivent être réalisées. L'acheteur doit notamment finaliser son financement auprès de la banque, tandis que le notaire effectue différentes vérifications juridiques et administratives concernant le bien immobilier. Lorsque toutes les conditions sont réunies, les deux parties se retrouvent chez le notaire pour signer l'<strong>acte authentique de vente</strong>, qui officialise définitivement le transfert de propriété.</p><p>Le compromis de vente constitue donc une étape fondamentale dans le processus d'achat immobilier. Il permet de sécuriser la transaction, de fixer les engagements des parties et de préparer la signature de l'acte définitif. Pour les acheteurs comme pour les vendeurs, bien comprendre le fonctionnement de cet avant-contrat est essentiel afin d'éviter les erreurs et d'aborder la transaction immobilière avec une vision claire et sécurisée. Chez AQUIZ, l'analyse du projet immobilier ne se limite pas à la capacité d'emprunt : comprendre chaque étape du processus d'achat, du compromis de vente jusqu'à la signature finale chez le notaire, permet aux futurs acquéreurs de prendre des décisions plus éclairées et de sécuriser leur projet immobilier dans les meilleures conditions.</p>",
    },
  ],
}

// ─── ARTICLE 9 — Indivision ou SCI ───
const indivisionOuSci: BlogArticle = {
  slug: 'indivision-ou-sci-acheter-a-plusieurs',
  title: 'Indivision ou SCI : quelle structure privilégier pour acheter un bien immobilier à plusieurs ?',
  excerpt:
    'Acheter à plusieurs : faut-il choisir l\'indivision ou créer une SCI ? Avantages, limites, fiscalité et conseils pour bien structurer votre achat.',
  category: 'achat',
  tags: ['indivision', 'SCI', 'achat à plusieurs', 'patrimoine', 'investissement'],
  publishedAt: '2026-03-01',
  author: AQUIZ_AUTHOR,
  readingTime: 9,
  coverImage: '/images/blog/investissement-locatif.jpg',
  coverAlt: 'Maquette de maison posée sur des documents juridiques et financiers',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: "Évaluez votre capacité d'achat à plusieurs",
    },
  ],
  sections: [
    {
      heading: 'Acheter à plusieurs : deux options principales',
      content:
        "<p>Acheter un bien immobilier à plusieurs est une solution de plus en plus courante, que ce soit pour un couple, des membres d'une même famille ou des associés souhaitant investir ensemble. Cependant, cette situation soulève une question importante au moment de structurer l'achat : faut-il acheter en <strong>indivision</strong> ou créer une <strong>SCI (Société Civile Immobilière)</strong> ? Ces deux modes de détention permettent de devenir propriétaire à plusieurs, mais ils répondent à des logiques juridiques et patrimoniales différentes. Comprendre leurs caractéristiques, leurs avantages et leurs limites est essentiel afin de choisir la structure la plus adaptée à son projet immobilier.</p>",
    },
    {
      heading: "L'indivision : simplicité et limites",
      content:
        "<p>L'indivision est la forme la plus simple pour acheter un bien immobilier à plusieurs. Dans ce cas, chaque acquéreur devient propriétaire d'une <strong>quote-part du bien</strong>, proportionnelle à sa participation financière dans l'achat. Par exemple, si deux personnes achètent un appartement ensemble et que l'une finance 60 % du prix et l'autre 40 %, ces proportions seront inscrites dans l'acte de vente chez le notaire. Chaque indivisaire possède donc une part du bien, sans que celui-ci soit physiquement divisé. L'indivision est souvent utilisée par les couples non mariés, les partenaires de PACS ou les héritiers lors d'une succession. Selon le Code civil, toutes les décisions importantes concernant le bien doivent être prises collectivement par les indivisaires, ce qui implique une gestion partagée du patrimoine immobilier.</p><p>L'un des principaux avantages de l'indivision est sa simplicité. Contrairement à la SCI, il n'est pas nécessaire de créer une structure juridique spécifique ni d'effectuer des formalités administratives complexes. L'achat se réalise directement chez le notaire, comme dans une transaction immobilière classique. Ce mode de détention permet également une certaine souplesse dans la répartition des parts, puisque chaque acquéreur peut financer une part différente du projet. Cependant, l'indivision présente aussi des limites. Le principe juridique fondamental de ce régime est que <em>\"nul ne peut être contraint de rester en indivision\"</em>, ce qui signifie qu'un indivisaire peut demander la vente du bien à tout moment. Cette règle peut entraîner des situations conflictuelles si les co-propriétaires ne sont pas d'accord sur la gestion ou sur la vente du logement.</p><p>Pour encadrer cette situation, il est possible de signer une <strong>convention d'indivision</strong> devant notaire. Ce document permet d'organiser la gestion du bien et de fixer certaines règles entre les propriétaires, par exemple la durée de l'indivision, la répartition des charges ou les modalités de revente. Cette convention peut sécuriser l'achat mais elle reste moins structurée qu'une société immobilière. C'est pour cette raison que certains acheteurs préfèrent se tourner vers la création d'une SCI, qui offre un cadre juridique plus stable.</p>",
    },
    {
      heading: 'La SCI : une structure plus stable',
      content:
        "<p>La Société Civile Immobilière est une structure juridique qui permet à plusieurs personnes de détenir et de gérer un bien immobilier ensemble. Contrairement à l'indivision, ce n'est pas directement le bien qui appartient aux acheteurs mais <strong>la société qui en est propriétaire</strong>. Les associés détiennent des parts sociales proportionnelles à leur investissement dans la société. La SCI est créée lors de la rédaction de <strong>statuts</strong> qui définissent précisément les règles de fonctionnement, la gestion du bien et les pouvoirs du gérant. Cette organisation permet souvent d'éviter les blocages décisionnels que l'on peut rencontrer en indivision.</p><p>L'un des principaux avantages de la SCI est sa capacité à structurer la gestion du patrimoine immobilier sur le long terme. Les statuts permettent de définir les modalités de prise de décision, la répartition des charges ou encore les conditions de cession des parts. Cette structure est particulièrement utilisée dans les projets familiaux ou patrimoniaux, notamment pour organiser la <strong>transmission d'un bien immobilier</strong> entre plusieurs héritiers. En effet, la SCI facilite la transmission progressive du patrimoine, par exemple via la donation de parts sociales à ses enfants, tout en conservant une gestion centralisée du bien.</p><p>La SCI présente également un intérêt en matière de gestion et d'organisation. Un gérant, désigné dans les statuts, peut être chargé de prendre les décisions courantes concernant le bien immobilier, ce qui simplifie l'administration quotidienne. En revanche, la création d'une SCI implique certaines formalités administratives : rédaction des statuts, immatriculation de la société, publication d'une annonce légale et tenue d'une comptabilité minimale. Ces démarches entraînent donc des coûts et une gestion administrative plus importante que dans le cadre d'une indivision.</p>",
    },
    {
      heading: 'Comment choisir entre indivision et SCI ?',
      content:
        "<p>Le choix entre indivision et SCI dépend avant tout de la nature du projet immobilier. Pour un achat simple entre deux personnes, notamment dans le cadre d'un couple ou d'un premier achat immobilier, l'indivision reste souvent la solution la plus rapide et la plus simple à mettre en place. Elle permet d'acheter facilement sans structure juridique supplémentaire. En revanche, pour des projets patrimoniaux plus complexes — par exemple un investissement locatif à plusieurs, une organisation familiale ou une stratégie de transmission — la SCI peut offrir davantage de sécurité et de flexibilité sur le long terme.</p><p>Il est également important de considérer les implications fiscales et juridiques de chaque solution. En indivision, chaque propriétaire est imposé individuellement sur sa part des revenus éventuels du bien. Dans une SCI, le régime fiscal dépend du choix effectué par les associés : la société peut être soumise à l'impôt sur le revenu ou à l'impôt sur les sociétés selon les objectifs du projet. Cette dimension fiscale doit donc être analysée avec attention avant de structurer l'investissement immobilier.</p><p>Dans tous les cas, acheter un bien immobilier à plusieurs nécessite une réflexion approfondie afin d'éviter les difficultés de gestion ou les conflits futurs. La répartition des charges, les modalités de prise de décision et les conditions de sortie du projet doivent être clairement définies dès le départ.</p>",
    },
  ],
}

// ─── ARTICLE 10 — Emprunt en SCI ───
const empruntSci: BlogArticle = {
  slug: 'emprunt-sci-financement-immobilier',
  title: 'Emprunt en SCI : comment financer un achat immobilier avec une Société Civile Immobilière ?',
  excerpt:
    'Financement en SCI : fonctionnement, caution personnelle, apport, garanties et fiscalité. Guide complet pour emprunter via une Société Civile Immobilière.',
  category: 'financement',
  tags: ['SCI', 'emprunt', 'financement', 'investissement', 'patrimoine immobilier'],
  publishedAt: '2026-03-05',
  author: AQUIZ_AUTHOR,
  readingTime: 10,
  coverImage: '/images/blog/frais-notaire.jpg',
  coverAlt: 'Documents juridiques et clés de maison symbolisant un montage immobilier en SCI',
  relatedTools: [
    {
      label: 'Simulateur Mode A',
      href: '/simulateur/mode-a',
      description: "Évaluez la capacité d'emprunt des associés de votre SCI",
    },
  ],
  sections: [
    {
      heading: 'Le fonctionnement d\'une SCI emprunteuse',
      content:
        "<p>L'emprunt en SCI (Société Civile Immobilière) est une solution de financement de plus en plus utilisée par les investisseurs et les familles souhaitant acheter un bien immobilier à plusieurs. Cette structure juridique permet d'organiser la détention et la gestion d'un patrimoine immobilier tout en facilitant la répartition des droits entre associés. Contrairement à un achat classique en nom propre, c'est <strong>la société qui devient propriétaire du bien</strong> et qui contracte le crédit immobilier auprès de la banque. Les associés détiennent quant à eux des parts sociales proportionnelles à leur investissement dans la société. Cette organisation peut offrir une grande souplesse patrimoniale, mais elle implique également des règles spécifiques en matière de financement, de fiscalité et de responsabilité.</p><p>Une SCI est une société civile composée d'<strong>au moins deux associés</strong>, dont l'objet principal est la détention et la gestion de biens immobiliers. Les associés rédigent des statuts qui définissent les règles de fonctionnement de la société : répartition des parts, pouvoirs du gérant, modalités de décision ou encore conditions de cession des parts sociales. Lorsque la SCI souhaite acquérir un bien immobilier, elle peut recourir à un prêt immobilier comme le ferait un particulier. Cependant, dans la pratique, la banque analyse le dossier différemment. Elle ne se contente pas d'évaluer la société : elle examine aussi la situation financière des associés qui la composent.</p>",
    },
    {
      heading: "L'analyse bancaire d'un dossier SCI",
      content:
        "<p>Même si la SCI est juridiquement l'emprunteur, les banques demandent presque toujours que les associés se portent <strong>caution personnelle</strong> du prêt immobilier. Cette exigence s'explique par le fait que la responsabilité des associés d'une SCI est dite <strong>indéfinie mais non solidaire</strong>. Cela signifie que les associés peuvent être tenus responsables des dettes de la société à hauteur de leur participation au capital, mais seulement si la société elle-même ne peut pas rembourser ses engagements. Dans la pratique bancaire, cette responsabilité se traduit souvent par une analyse détaillée de la situation financière personnelle des associés : revenus, stabilité professionnelle, niveau d'endettement et patrimoine global.</p><p>L'étude d'un crédit immobilier en SCI repose donc sur une logique similaire à celle d'un emprunt classique, mais avec une analyse plus large. La banque examine notamment la solidité du projet immobilier, la qualité du bien financé, la capacité de remboursement globale des associés et la cohérence financière du montage. Lorsque le bien est destiné à la location, l'établissement prêteur prend également en compte les loyers futurs dans l'analyse du financement. Toutefois, comme pour les particuliers, les règles du crédit immobilier restent encadrées par les recommandations du Haut Conseil de stabilité financière, notamment en matière de durée d'emprunt et d'endettement global.</p>",
    },
    {
      heading: "L'apport personnel et les garanties",
      content:
        "<p>L'apport personnel joue également un rôle important dans un projet financé via une SCI. Les associés peuvent apporter des fonds directement au capital social de la société ou effectuer des apports en <strong>compte courant d'associé</strong>, qui correspondent à des avances remboursables par la société. Plus l'apport est élevé, plus le projet apparaît solide aux yeux de la banque, car il réduit le montant du financement demandé et démontre l'implication financière des associés dans le projet immobilier.</p><p>Comme pour tout crédit immobilier, la banque exige généralement une garantie afin de sécuriser le prêt. Cette garantie peut prendre la forme d'une <strong>hypothèque</strong> sur le bien immobilier détenu par la SCI ou d'une <strong>caution bancaire</strong>. L'hypothèque permet au prêteur de saisir et vendre le bien en cas de défaut de paiement afin de récupérer les sommes dues. Le cautionnement constitue une autre forme de garantie fréquemment utilisée, notamment dans les financements immobiliers modernes.</p>",
    },
    {
      heading: 'La fiscalité d\'une SCI',
      content:
        "<p>La fiscalité constitue également un élément central dans un projet immobilier financé via une SCI. Par défaut, une SCI est soumise à l'<strong>impôt sur le revenu</strong>, ce qui signifie que les bénéfices ou les pertes de la société sont répartis entre les associés en fonction de leurs parts sociales. Chaque associé déclare ensuite sa quote-part dans sa déclaration personnelle, généralement dans la catégorie des revenus fonciers lorsque le bien est loué. Cette transparence fiscale est souvent privilégiée dans les projets patrimoniaux familiaux.</p><p>La SCI peut également opter pour l'<strong>impôt sur les sociétés</strong>, ce qui modifie profondément la logique fiscale du projet. Dans ce cas, c'est la société elle-même qui est imposée sur son résultat. Ce régime peut permettre d'amortir le bien immobilier et de réduire la fiscalité sur les revenus locatifs, mais il entraîne également une fiscalité différente en cas de revente du bien. Le choix entre l'impôt sur le revenu et l'impôt sur les sociétés doit donc être étudié avec attention avant de structurer le projet immobilier.</p>",
    },
    {
      heading: 'SCI et résidence principale : les limites',
      content:
        "<p>Il est également important de noter que l'achat d'une résidence principale via une SCI peut présenter certaines limites. Par exemple, certaines aides publiques destinées aux particuliers, comme le <strong>prêt à taux zéro</strong>, ne sont pas accessibles dans ce type de montage. Pour un premier achat immobilier, l'acquisition en nom propre reste donc souvent plus adaptée.</p><p>En revanche, la SCI peut être particulièrement intéressante dans des <strong>projets patrimoniaux ou d'investissement</strong>. Elle permet notamment d'organiser la gestion d'un bien entre plusieurs associés, d'éviter les blocages de l'indivision et de faciliter la transmission d'un patrimoine immobilier au sein d'une famille. Les parts sociales peuvent par exemple être transmises progressivement aux enfants dans le cadre d'une stratégie de donation.</p><p>En définitive, emprunter en SCI peut constituer un outil puissant pour structurer un projet immobilier à plusieurs. Cette solution offre une grande souplesse en matière de gestion et de transmission du patrimoine, mais elle implique également une analyse financière et fiscale approfondie. Avant de choisir ce type de montage, il est essentiel d'évaluer la cohérence du projet immobilier, la capacité d'emprunt des associés et les objectifs patrimoniaux à long terme.</p>",
    },
  ],
}

// ─── Export ───

/** Liste de tous les articles du blog */
export const BLOG_ARTICLES: BlogArticle[] = [
  premierAchatParis,
  erreursPrimoAccedant,
  checklistDemenagement,
  resteAVivre,
  apportPersonnel,
  marcheImmobilier2026,
  villesIdfAccessibles,
  compromisVente,
  indivisionOuSci,
  empruntSci,
]

/** Trouver un article par son slug */
export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug)
}

/** Obtenir les articles d'une catégorie */
export function getArticlesByCategory(category: BlogCategory): BlogArticle[] {
  return BLOG_ARTICLES.filter((a) => a.category === category)
}

/** Obtenir toutes les catégories qui ont au moins un article */
export function getActiveCategories(): BlogCategory[] {
  const cats = new Set(BLOG_ARTICLES.map((a) => a.category))
  return [...cats]
}

/** Obtenir les articles recommandés (même catégorie, hors article courant) */
export function getRelatedArticles(
  current: BlogArticle,
  limit = 2,
): BlogArticle[] {
  return BLOG_ARTICLES.filter(
    (a) => a.slug !== current.slug && a.category === current.category,
  )
    .slice(0, limit)
    .concat(
      BLOG_ARTICLES.filter(
        (a) => a.slug !== current.slug && a.category !== current.category,
      ),
    )
    .slice(0, limit)
}

/** Obtenir l'article précédent et suivant dans la liste */
export function getAdjacentArticles(
  current: BlogArticle,
): { prev: BlogArticle | null; next: BlogArticle | null } {
  const idx = BLOG_ARTICLES.findIndex((a) => a.slug === current.slug)
  return {
    prev: idx > 0 ? BLOG_ARTICLES[idx - 1] : null,
    next: idx < BLOG_ARTICLES.length - 1 ? BLOG_ARTICLES[idx + 1] : null,
  }
}
