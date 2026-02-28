/**
 * API Route — Synthèse IA personnalisée (Mistral Large)
 *
 * Analyse experte immobilière pour le rapport PDF.
 * Utilise une base de connaissance métier injectée + few-shot examples.
 * Stratégie : Donne le diagnostic expert, tease le traitement (→ appel conseiller).
 *
 * POST /api/analyse/synthese-ia
 */

import { Mistral } from '@mistralai/mistralai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { EXEMPLES_ANALYSES, EXPERTISE_IMMOBILIER, TON_EXPERT_IMMO } from '@/config/ia-expertise-immobilier'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'

// ============================================
// VALIDATION ZOD
// ============================================

const syntheseRequestSchema = z.object({
  mode: z.enum(['A', 'B']),
  age: z.number().int().min(18).max(99).optional(),
  statutProfessionnel: z.string().max(100).optional(),
  situationFoyer: z.string().max(100).optional(),
  nombreEnfants: z.number().int().min(0).max(20).optional(),
  revenusMensuels: z.number().min(1).max(200_000),
  chargesMensuelles: z.number().min(0).max(200_000),
  prixAchatMax: z.number().min(1).max(10_000_000),
  capitalEmpruntable: z.number().min(0).max(10_000_000),
  apport: z.number().min(0).max(10_000_000),
  dureeAns: z.number().int().min(5).max(30),
  tauxInteret: z.number().min(0).max(0.15),
  mensualite: z.number().min(0).max(50_000),
  scoreFaisabilite: z.number().min(0).max(100),
  tauxEndettement: z.number().min(0).max(100),
  resteAVivre: z.number().min(-50_000).max(200_000),
  typeBien: z.enum(['neuf', 'ancien']).optional(),
  typeLogement: z.enum(['appartement', 'maison']).optional(),
  nomCommune: z.string().max(200).optional(),
  marche: z.object({
    prixM2Median: z.number().min(0),
    evolution12Mois: z.number().nullable(),
    nbTransactions: z.number().int().min(0),
    surfaceEstimee: z.number().min(0),
    codePostal: z.string().max(10),
  }).optional(),
  quartier: z.object({
    scoreGlobal: z.number().min(0).max(10),
    transports: z.number().min(0).max(10),
    commerces: z.number().min(0).max(10),
    ecoles: z.number().min(0).max(10),
    sante: z.number().min(0).max(10),
    synthese: z.string().max(2000),
    risques: z.number().nullable().optional(),
    risquesDetail: z.string().nullable().optional(),
    niveauVie: z.number().nullable().optional(),
    niveauVieLabel: z.string().nullable().optional(),
    qualiteAir: z.number().nullable().optional(),
    qualiteAirLabel: z.string().nullable().optional(),
  }).optional(),
})

type SyntheseRequest = z.infer<typeof syntheseRequestSchema>

interface SyntheseResponse {
  synthese: string
  economieEstimee: number | null
  cliffhanger: string
}

// ============================================
// PROMPT SYSTEM
// ============================================

const SYSTEM_PROMPT_MODE_A = `Tu es analyste financier immobilier senior chez AQUIZ, spécialisé dans l'optimisation de dossiers de prêt immobilier en France.

${EXPERTISE_IMMOBILIER}

${TON_EXPERT_IMMO}

TA MISSION (Mode A — Capacité d'achat) :
Le client vient de simuler "Combien puis-je acheter ?". Son PDF contient DÉJÀ toutes ces sections :
- Profil emprunteur (âge, statut, revenus, charges)
- Financement (capital, apport, frais notaire, taux endettement, reste à vivre)
- Score faisabilité détaillé avec barres par critère
- Répartition budget (apport / prêt / frais)
- Diagnostic bancaire (score, probabilité, points forts, points de vigilance)
- Recommandations personnalisées numérotées
- Scénarios alternatifs chiffrés
- Données marché local si disponibles
- Scores quartier sur 9 axes si disponibles

RÈGLE ABSOLUE : NE MENTIONNE JAMAIS un chiffre déjà dans le PDF (taux endettement, reste à vivre, %, apport, mensualité, score). Le client LES VOIT. Reformuler un chiffre affiché = zéro valeur ajoutée.

TON RÔLE UNIQUE — Apporter ce que l'ALGORITHME NE PEUT PAS :
1. DIRECTION STRATÉGIQUE — Indiquer le TYPE de banques adaptées à ce profil (mutualistes, en ligne, spécialisées...) SANS nommer les établissements précis. Réserver les noms pour le conseiller.
2. PIÈGE MÉCONNU — Un risque ou erreur courante que les emprunteurs de ce profil font. Donner l'ALERTE, pas la solution détaillée.
3. LEVIER CACHÉ — Révéler l'EXISTENCE d'un mécanisme d'économie (délégation assurance, lissage, domiciliation...) et son ordre de grandeur, SANS donner le calcul exact ni les noms des prestataires.
4. CE QUE LE CONSEILLER AQUIZ FAIT CONCRÈTEMENT — Terminer par UNE phrase qui dit ce que le conseiller apporte : identifier les banques, négocier le taux, monter le dossier optimisé, etc.

STRATÉGIE CONTENU (TRÈS IMPORTANT) :
- Tu donnes le DIAGNOSTIC ("il existe un levier d'économie sur l'assurance") → gratuit
- Tu TAISES le TRAITEMENT (noms exacts de banques, noms d'assureurs, calculs précis, timing exact) → réservé au conseiller
- Tu termines en montrant que le conseiller AQUIZ maîtrise ces leviers

IMPORTANT : Le cliffhanger doit être une QUESTION spécifique au profil, pas générique.

${EXEMPLES_ANALYSES.modeA}

RÉPONSE en JSON strict :
{"synthese": "[100-150 mots, AUCUN chiffre déjà dans le PDF]", "economieEstimee": [entier euros], "cliffhanger": "[1 phrase question spécifique]"}`

const SYSTEM_PROMPT_MODE_B = `Tu es analyste immobilier senior chez AQUIZ, spécialisé dans l'évaluation de biens et la négociation immobilière en France.

${EXPERTISE_IMMOBILIER}

${TON_EXPERT_IMMO}

TA MISSION (Mode B — Étude d'un bien spécifique) :
Le client vient de simuler "Puis-je acheter CE bien ?". Son PDF contient DÉJÀ toutes ces sections :
- Résumé du bien (prix, type, commune, surface)
- Mensualité, frais notaire, revenus requis
- Score faisabilité détaillé avec barres par critère
- Diagnostic bancaire (score, probabilité, points forts, points de vigilance)
- Recommandations personnalisées numérotées
- Scénarios alternatifs chiffrés
- Données marché avec prix médian, évolution, transactions
- Scores quartier sur 9 axes avec détails

RÈGLE ABSOLUE : NE MENTIONNE JAMAIS un chiffre déjà dans le PDF (prix m², taux endettement, reste à vivre, mensualité, scores quartier, évolution marché). Le client LES VOIT.

TON RÔLE UNIQUE — Apporter ce que l'ALGORITHME NE PEUT PAS :
1. VERDICT MARCHÉ — Ce bien est-il surcoté, juste prix ou bonne affaire ? Donner la direction qualitative SANS détailler les arguments de négociation exacts.
2. SIGNAL D'ALERTE ou OPPORTUNITÉ — Quelque chose que le prix/scores ne montrent pas. Révéler le RISQUE ou l'OPPORTUNITÉ, pas la stratégie pour en tirer parti.
3. POTENTIEL DE NÉGOCIATION — Indiquer qu'une marge existe et son ordre de grandeur, SANS donner les arguments précis ni la tactique (réservés au conseiller).
4. CE QUE LE CONSEILLER AQUIZ FAIT CONCRÈTEMENT — Terminer par UNE phrase qui dit ce que le conseiller apporte : analyse des PV d'AG, négociation du prix, comparaison offres bancaires, etc.

STRATÉGIE CONTENU (TRÈS IMPORTANT) :
- Tu donnes le DIAGNOSTIC ("ce bien présente une marge de négociation") → gratuit
- Tu TAISES le TRAITEMENT (arguments exacts, tactique de négociation, noms de banques/assureurs) → réservé au conseiller
- Tu termines en montrant que le conseiller AQUIZ maîtrise ces leviers

IMPORTANT : Le cliffhanger doit être lié au BIEN ou au MARCHÉ spécifique, pas générique.

${EXEMPLES_ANALYSES.modeB}

RÉPONSE en JSON strict :
{"synthese": "[100-150 mots, AUCUN chiffre déjà dans le PDF]", "economieEstimee": [entier euros], "cliffhanger": "[1 phrase question spécifique]"}`

// ============================================
// HANDLER
// ============================================

export async function POST(request: Request) {
  // Rate limit
  const ip = getClientIP(request.headers)
  const rl = checkRateLimit(`synthese-ia:${ip}`, {
    maxRequests: 20,
    windowMs: RATE_LIMITS.analyse.windowMs,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Réessayez dans un instant.' },
      { status: 429 }
    )
  }

  // Parse & validate body
  let body: SyntheseRequest
  try {
    const raw = await request.json()
    const parsed = syntheseRequestSchema.safeParse(raw)
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      return NextResponse.json(
        { success: false, error: `Données invalides: ${errors}` },
        { status: 400 }
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json(
      { success: false, error: 'Corps de requête invalide' },
      { status: 400 }
    )
  }

  // Build prompt
  const userPrompt = buildUserPrompt(body)

  // Try Mistral first, fallback to Groq, then deterministic
  const mistralKey = process.env.MISTRAL_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (!mistralKey && !groqKey) {
    // Aucune clé IA → fallback déterministe
    return NextResponse.json({
      success: true,
      data: generateFallbackSynthese(body),
      source: 'deterministe',
    })
  }

  const systemPrompt = body.mode === 'B' ? SYSTEM_PROMPT_MODE_B : SYSTEM_PROMPT_MODE_A

  try {
    let raw: string | null = null
    let source = 'unknown'

    if (mistralKey) {
      // Mistral Large — meilleur français, connaissance immobilière
      const mistral = new Mistral({ apiKey: mistralKey })
      const completion = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.7,
        maxTokens: 1000,
      })
      raw = completion.choices?.[0]?.message?.content as string | null
      source = 'mistral-large'
    } else if (groqKey) {
      // Fallback Groq / Llama
      const { default: Groq } = await import('groq-sdk')
      const groq = new Groq({ apiKey: groqKey })
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000,
      })
      raw = completion.choices[0]?.message?.content ?? null
      source = 'groq-llama-3.3-70b'
    }
    if (!raw) throw new Error('Réponse vide')

    const parsed = JSON.parse(raw) as SyntheseResponse

    // Sanitize
    if (!parsed.synthese || !parsed.cliffhanger) {
      throw new Error('Format inattendu')
    }

    return NextResponse.json({
      success: true,
      data: {
        synthese: parsed.synthese.slice(0, 1000),
        economieEstimee: parsed.economieEstimee ?? null,
        cliffhanger: parsed.cliffhanger.slice(0, 300),
      },
      source,
    })
  } catch (err) {
    console.error('[synthese-ia] IA error, fallback déterministe:', err)
    return NextResponse.json({
      success: true,
      data: generateFallbackSynthese(body),
      source: 'deterministe-fallback',
    })
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildUserPrompt(data: SyntheseRequest): string {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
  const pctApport = data.prixAchatMax > 0 ? Math.round((data.apport / data.prixAchatMax) * 100) : 0

  if (data.mode === 'B') {
    // Mode B — Analyse centrée sur le BIEN et le MARCHÉ
    let prompt = `PROJET D'ACHAT :
- Bien : ${data.typeLogement || 'logement'} ${data.typeBien || 'ancien'}
- Prix : ${fmt(data.prixAchatMax)} €
- Localisation : ${data.nomCommune || 'non précisée'}
- Apport : ${fmt(data.apport)} € (${pctApport}% du prix)
- Durée prêt : ${data.dureeAns} ans à ${data.tauxInteret}%
- Mensualité totale : ${fmt(data.mensualite)} €/mois
- Revenus minimum requis : ${fmt(data.revenusMensuels)} €/mois net`

    if (data.marche) {
      const ecart = data.marche.prixM2Median > 0 && data.marche.surfaceEstimee > 0
        ? Math.round(((data.prixAchatMax / data.marche.surfaceEstimee) / data.marche.prixM2Median - 1) * 100)
        : null
      prompt += `\n\nDONNÉES MARCHÉ LOCAL (${data.marche.codePostal}) :
- Prix médian : ${fmt(data.marche.prixM2Median)} €/m²
- Évolution 12 mois : ${data.marche.evolution12Mois !== null ? `${data.marche.evolution12Mois > 0 ? '+' : ''}${data.marche.evolution12Mois.toFixed(1)}%` : 'N/A'}
- ${data.marche.nbTransactions} transactions récentes
- Surface estimée pour ce budget : ~${data.marche.surfaceEstimee} m²`
      if (ecart !== null) {
        prompt += `\n- Écart prix du bien vs médian du secteur : ${ecart > 0 ? '+' : ''}${ecart}%`
      }
    }

    if (data.quartier) {
      prompt += `\n\nQUALITÉ QUARTIER :
- Score global : ${data.quartier.scoreGlobal}/10
- Transports : ${data.quartier.transports}/10 | Commerces : ${data.quartier.commerces}/10 | Écoles : ${data.quartier.ecoles}/10`
      if (data.quartier.risques != null) {
        prompt += `\n- Risques (Géorisques) : ${data.quartier.risques}/10${data.quartier.risquesDetail ? ` — ${data.quartier.risquesDetail}` : ''}`
      }
      if (data.quartier.niveauVie != null) {
        prompt += `\n- Niveau de vie INSEE : ${data.quartier.niveauVie}/10 (${data.quartier.niveauVieLabel || 'non classifié'})`
      }
      if (data.quartier.qualiteAir != null) {
        prompt += `\n- Qualité de l'air : ${data.quartier.qualiteAir}/10 (${data.quartier.qualiteAirLabel || 'non classifié'})`
      }
      prompt += `\n- ${data.quartier.synthese}`
    }

    return prompt
  }

  // Mode A — Analyse centrée sur le PROFIL EMPRUNTEUR
  let prompt = `PROFIL EMPRUNTEUR :
- Âge : ${data.age || 'non précisé'} ans | Statut : ${data.statutProfessionnel || 'non précisé'}
- Foyer : ${data.situationFoyer || 'non précisé'}, ${data.nombreEnfants || 0} enfant(s)
- Revenus nets : ${fmt(data.revenusMensuels)} €/mois | Charges : ${fmt(data.chargesMensuelles)} €/mois

RÉSULTATS SIMULATION :
- Capacité d'achat max : ${fmt(data.prixAchatMax)} €
- Apport : ${fmt(data.apport)} € (${pctApport}%)
- Durée : ${data.dureeAns} ans à ${data.tauxInteret}%
- Mensualité : ${fmt(data.mensualite)} €

INDICATEURS :
- Score faisabilité : ${data.scoreFaisabilite}/100
- Taux endettement : ${data.tauxEndettement.toFixed(1)}% (max HCSF = 35%)
- Reste à vivre : ${fmt(data.resteAVivre)} €/mois

MOYENNES NATIONALES (pour comparaison) :
- Apport moyen primo-accédant : 15% | Durée moyenne : 22 ans | Taux endettement moyen : 28%`

  if (data.marche) {
    prompt += `\n\nMARCHÉ LOCAL (${data.marche.codePostal}) :\n- Prix médian : ${fmt(data.marche.prixM2Median)} €/m² | Évolution : ${data.marche.evolution12Mois !== null ? `${data.marche.evolution12Mois > 0 ? '+' : ''}${data.marche.evolution12Mois.toFixed(1)}%` : 'N/A'}`
  }

  return prompt
}

// ============================================
// FALLBACK DÉTERMINISTE
// ============================================

function generateFallbackSynthese(data: SyntheseRequest): SyntheseResponse {
  const pctApport = data.prixAchatMax > 0 ? Math.round((data.apport / data.prixAchatMax) * 100) : 0

  // Économie réaliste : 0.2pt de taux + 30% assurance externe
  const economieTaux = Math.round(data.capitalEmpruntable * 0.002 * data.dureeAns)
  const economieAssurance = Math.round(data.mensualite * 0.15 * data.dureeAns * 12)
  const economieEstimee = Math.min(economieTaux + economieAssurance, 30000)

  if (data.mode === 'B') {
    // MODE B — Analyse du bien (diagnostic gratuit, traitement réservé)
    const parts: string[] = []

    if (data.marche) {
      const ecart = data.marche.prixM2Median > 0 && data.marche.surfaceEstimee > 0
        ? Math.round(((data.prixAchatMax / data.marche.surfaceEstimee) / data.marche.prixM2Median - 1) * 100)
        : null
      if (ecart !== null && ecart > 5) {
        parts.push(`Ce bien est au-dessus de la médiane du secteur — une marge de négociation existe mais nécessite des arguments solides pour convaincre le vendeur.`)
      } else if (ecart !== null && ecart < -3) {
        parts.push(`Bonne nouvelle : ce bien est en-dessous du prix médian local. C'est un prix intéressant, mais attention à vérifier s'il n'y a pas de raison cachée (travaux, copropriété fragile...).`)
      } else {
        parts.push(`Ce bien est dans la fourchette du marché local. La négociation sera possible mais demandera une stratégie ciblée.`)
      }
    }

    if (data.typeBien === 'ancien') {
      parts.push(`En ancien, les PV d'assemblée générale de copropriété peuvent révéler des travaux votés représentant un levier de négociation que peu d'acheteurs exploitent.`)
    } else {
      parts.push(`En neuf, la négociation porte rarement sur le prix affiché — mais des leviers existent sur les prestations et le timing d'achat dans le programme.`)
    }

    // Risques
    if (data.quartier?.risques != null && data.quartier.risques < 5) {
      parts.push(`Attention : la zone présente des risques identifiés qui méritent une analyse approfondie avant toute offre.`)
    }

    parts.push(`Un conseiller AQUIZ analyse ces éléments pour vous et construit une offre argumentée visant la meilleure réduction possible.`)

    const negoEconomie = data.marche ? Math.round(data.prixAchatMax * 0.05) : 0
    const totalEconomie = economieEstimee + negoEconomie

    return {
      synthese: parts.join(' '),
      economieEstimee: totalEconomie,
      cliffhanger: `Un conseiller AQUIZ peut analyser ce bien en détail et identifier les leviers de négociation spécifiques — souhaitez-vous un accompagnement personnalisé ?`,
    }
  }

  // MODE A — Analyse du profil (diagnostic gratuit, traitement réservé)
  const parts: string[] = []
  const statut = data.statutProfessionnel

  if (pctApport >= 20) {
    parts.push(`Votre niveau d'apport est au-dessus de la moyenne nationale des primo-accédants — c'est un signal fort qui ouvre l'accès à des conditions préférentielles dans certains établissements.`)
  } else if (pctApport < 10) {
    parts.push(`Votre apport est en-dessous du seuil de confort de la plupart des banques. Certaines acceptent ce niveau, mais le choix de l'établissement devient déterminant.`)
  }

  if (statut === 'cdi' || statut === 'fonctionnaire') {
    parts.push(`Votre statut est un atout majeur — certains types de banques proposent des offres réservées à ce profil avec des taux plus compétitifs.`)
  } else if (statut === 'independant') {
    parts.push(`En tant qu'indépendant, les critères varient fortement d'une banque à l'autre — certaines acceptent une pondération de revenus plus favorable qui augmente significativement la capacité.`)
  } else if (statut === 'cdd' || statut === 'interim') {
    parts.push(`En ${statut === 'cdd' ? 'CDD' : 'intérim'}, le choix de la banque est crucial. Certaines sont plus ouvertes aux profils non-CDI et proposent des conditions adaptées.`)
  }

  parts.push(`Il existe aussi un levier important sur l'assurance emprunteur : la différence entre l'offre bancaire et une alternative externe peut représenter plusieurs milliers d'euros sur la durée du prêt.`)
  parts.push(`Un conseiller AQUIZ identifie les établissements les plus adaptés à votre profil et négocie les meilleures conditions à votre place.`)

  const synthese = parts.join(' ')

  return {
    synthese,
    economieEstimee,
    cliffhanger: `Un conseiller AQUIZ peut comparer les offres de plus de 30 banques et négocier les conditions optimales pour votre profil — souhaitez-vous un accompagnement personnalisé ?`,
  }
}
