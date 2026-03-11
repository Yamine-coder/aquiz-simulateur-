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

import { EXEMPLES_ANALYSES, EXPERTISE_IMMOBILIER, IDENTITE_AQUIZ, TON_EXPERT_IMMO } from '@/config/ia-expertise-immobilier'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'

// Allow up to 30s for Mistral/Groq LLM response
export const maxDuration = 30

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
  tauxInteret: z.number().min(0).max(15),
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
    scoreGlobal: z.number().min(0).max(100),
    transports: z.number().min(0).max(100),
    commerces: z.number().min(0).max(100),
    ecoles: z.number().min(0).max(100),
    sante: z.number().min(0).max(100),
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

const SYSTEM_PROMPT_MODE_A = `${IDENTITE_AQUIZ}

${EXPERTISE_IMMOBILIER}

${TON_EXPERT_IMMO}

TA MISSION (Mode A — Capacité d'achat) :
Le client vient de simuler "Combien puis-je acheter ?". Son PDF contient DÉJÀ toutes les données chiffrées.

CONTEXTE : En Mode A, le client n'a PAS encore choisi de bien ni de localisation. Il cherche à savoir combien il peut acheter. Ton analyse porte sur la STRATÉGIE D'ACHAT — pas sur un quartier spécifique.

RÈGLE ABSOLUE : NE MENTIONNE JAMAIS un chiffre déjà dans le PDF. Reformuler un chiffre affiché = zéro valeur ajoutée.

FORMAT DE RÉPONSE (sections structurées) :

## Résumé
Reformule brièvement le projet et les chiffres clés en 1-2 phrases.

## Lecture immobilière
Explique ce que ce budget permet de viser : neuf vs ancien, type de bien, zones accessibles, critères de choix de quartier, horizon de détention.

## Lecture financière
Valide la faisabilité financière de façon concise. Ne prends pas toute la place.

## Points de vigilance
Liste les éléments à contrôler : DPE/passoire thermique, copropriété, coûts cachés, risque revente.

## Avis d'expert AQUIZ
Donne une position claire, nuancée et utile sur la stratégie d'acquisition.

## Recommandation
Propose l'action la plus pertinente pour la suite — ce que le conseiller AQUIZ apporte concrètement.

IMPORTANT : Le cliffhanger doit être une QUESTION spécifique au profil, pas générique.

${EXEMPLES_ANALYSES.modeA}

RÉPONSE en JSON strict :
{"synthese": "[150-250 mots structurés avec les sections ## ci-dessus, ton expert neutre]", "economieEstimee": [entier euros], "cliffhanger": "[1 phrase question spécifique]"}`

const SYSTEM_PROMPT_MODE_B = `${IDENTITE_AQUIZ}

${EXPERTISE_IMMOBILIER}

${TON_EXPERT_IMMO}

TA MISSION (Mode B — Étude d'un bien spécifique) :
Le client vient de simuler "Puis-je acheter CE bien ?". Son PDF contient DÉJÀ toutes les données chiffrées.

RÈGLE ABSOLUE : NE MENTIONNE JAMAIS un chiffre déjà dans le PDF. Le client LES VOIT.

FORMAT DE RÉPONSE (sections structurées) :

## Résumé
Reformule brièvement le projet et le bien ciblé en 1-2 phrases.

## Lecture immobilière
Évalue la cohérence du bien : prix vs marché, qualité de l'adresse, état probable, potentiel de valorisation, freins à la revente, marge de négociation.

## Lecture financière
Valide la faisabilité financière de façon concise. Ne prends pas toute la place.

## Points de vigilance
Liste les éléments à contrôler : DPE, copropriété, diagnostics, PV d'AG, travaux votés, risques quartier.

## Avis d'expert AQUIZ
Donne une position claire, nuancée et utile. Ce bien est-il une bonne acquisition pour CE profil ?

## Recommandation
Propose l'action la plus pertinente pour la suite — ce que le conseiller AQUIZ apporte concrètement (vérification du bien, négociation, montage).

IMPORTANT : Le cliffhanger doit être lié au BIEN ou au MARCHÉ spécifique, pas générique.

${EXEMPLES_ANALYSES.modeB}

RÉPONSE en JSON strict :
{"synthese": "[150-250 mots structurés avec les sections ## ci-dessus, ton expert neutre]", "economieEstimee": [entier euros], "cliffhanger": "[1 phrase question spécifique]"}`

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

  // Économie réaliste : négociation prix + optimisation financement
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
        parts.push(`Ce bien est au-dessus du prix médian du secteur — avant de faire une offre, il faut comprendre si cet écart se justifie par des prestations supérieures ou s'il y a une marge de négociation réelle.`)
      } else if (ecart !== null && ecart < -3) {
        parts.push(`Ce bien est positionné en-dessous du marché local, ce qui peut être une opportunité — mais à ce prix, il est prudent de vérifier l'état réel du bien, le DPE et la situation de la copropriété.`)
      } else {
        parts.push(`Ce bien est dans la fourchette du marché local. La question n'est pas seulement le prix, mais ce que le bien et son environnement apportent à votre projet de vie sur le long terme.`)
      }
    }

    if (data.typeBien === 'ancien') {
      parts.push(`En ancien, les documents de copropriété (PV d'AG, carnet d'entretien) et les diagnostics techniques sont des mines d'information — ils révèlent des travaux à venir et des coûts cachés que le prix affiché ne reflète pas.`)
    } else {
      parts.push(`En neuf, au-delà du prix, pensez à vérifier la réputation du promoteur, les délais de livraison annoncés vs réels, et les prestations incluses — c'est souvent là que se joue la vraie valeur de l'achat.`)
    }

    // Risques quartier
    if (data.quartier?.risques != null && data.quartier.risques < 5) {
      parts.push(`Attention : la zone présente des risques identifiés (Géorisques) qui méritent une analyse approfondie avant toute offre — c'est un point que beaucoup d'acheteurs découvrent trop tard.`)
    }

    // Quartier & projet de vie
    if (data.quartier && data.quartier.scoreGlobal > 0) {
      if (data.quartier.transports != null && data.quartier.transports < 4) {
        parts.push(`Le secteur est mal desservi en transports, ce qui peut impacter votre quotidien mais aussi la revente future — c'est un critère à intégrer dans votre réflexion.`)
      }
    }

    parts.push(`Un conseiller AQUIZ analyse le bien dans sa globalité — état, copropriété, quartier, potentiel de négociation et financement — pour vous aider à prendre une décision éclairée.`)

    const negoEconomie = data.marche ? Math.round(data.prixAchatMax * 0.05) : 0
    const totalEconomie = economieEstimee + negoEconomie

    return {
      synthese: parts.join(' '),
      economieEstimee: totalEconomie,
      cliffhanger: `Avez-vous vérifié les diagnostics techniques et les PV de copropriété de ce bien ? Un conseiller AQUIZ peut les analyser et identifier les leviers concrets avant votre offre.`,
    }
  }

  // MODE A — Analyse du profil et stratégie d'acquisition
  const parts: string[] = []
  const statut = data.statutProfessionnel

  // Stratégie d'achat selon l'apport
  if (pctApport >= 20) {
    parts.push(`Votre niveau d'apport vous donne une vraie liberté de choix — non seulement pour le financement, mais aussi pour cibler des biens qui nécessitent des travaux, où la négociation est plus forte.`)
  } else if (pctApport < 10) {
    parts.push(`Avec un apport modeste, la stratégie d'achat doit être précise : privilégiez les biens au juste prix dans des secteurs à forte demande — c'est la meilleure façon de sécuriser votre projet tout en construisant du patrimoine.`)
  }

  // Profil et projet de vie
  if (statut === 'cdi' || statut === 'fonctionnaire') {
    parts.push(`Votre stabilité professionnelle est un atout pour tout le parcours d'acquisition — du financement à la négociation, les vendeurs et les banques sont rassurés par ce type de profil.`)
  } else if (statut === 'independant') {
    parts.push(`En tant qu'indépendant, le parcours d'achat demande une préparation spécifique — pas seulement pour le financement, mais aussi pour structurer une offre crédible face aux vendeurs qui préfèrent souvent les profils salariés.`)
  } else if (statut === 'cdd' || statut === 'interim') {
    parts.push(`En ${statut === 'cdd' ? 'CDD' : 'intérim'}, l'achat est possible mais la stratégie doit être ciblée — il faut identifier les bons secteurs, les bons biens ET les solutions de financement adaptées en même temps.`)
  }

  // Vigilance acquisition
  parts.push(`Quel que soit le budget, la vraie différence se fait sur le choix du bien : un DPE défavorable, des travaux de copropriété imprévus ou un quartier mal desservi peuvent transformer une bonne affaire en mauvais investissement.`)

  parts.push(`Un conseiller AQUIZ vous accompagne sur tout le parcours — analyse des biens, vérification des documents, négociation du prix et montage financier — pour que votre achat soit le bon.`)

  const synthese = parts.join(' ')

  return {
    synthese,
    economieEstimee,
    cliffhanger: `Savez-vous quels critères vérifier en priorité sur un bien avant de faire une offre ? Un conseiller AQUIZ peut vous guider pour éviter les pièges courants.`,
  }
}
