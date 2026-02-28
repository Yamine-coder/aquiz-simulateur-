/**
 * API Route — Synthèse IA Comparaison (Mistral Large)
 *
 * Analyse comparative experte de 2-4 biens immobiliers.
 * Reçoit les scores structurés du moteur de scoring + enrichissements.
 * Produit une analyse de courtier qui compare, tranche et teaser.
 *
 * Stratégie : Mistral Large → Groq Llama → Déterministe
 *
 * POST /api/analyse/synthese-ia-comparaison
 */

import { Mistral } from '@mistralai/mistralai'
import { NextResponse } from 'next/server'

import { EXPERTISE_IMMOBILIER, TON_EXPERT_IMMO } from '@/config/ia-expertise-immobilier'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'

// ============================================
// TYPES
// ============================================

/** Données d'un axe de scoring pour le prompt */
interface AxePrompt {
  label: string
  score: number
  detail: string
  impact: 'positif' | 'neutre' | 'negatif'
}

/** Données complètes d'un bien pour le prompt */
interface BienComparaisonPrompt {
  /** Identifiant unique */
  id: string
  /** Titre ou description courte */
  titre: string
  /** Données de base */
  prix: number
  surface: number
  prixM2: number
  type: 'appartement' | 'maison'
  pieces: number
  chambres: number
  ville: string
  codePostal: string
  dpe: string
  etage?: number
  anneeConstruction?: number
  /** Équipements */
  parking?: boolean
  balconTerrasse?: boolean
  cave?: boolean
  ascenseur?: boolean
  /** Charges */
  chargesMensuelles?: number
  taxeFonciere?: number
  /** Scoring professionnel */
  scoreGlobal: number
  rang: number
  verdict: string
  confiance: number
  axes: AxePrompt[]
  /** Estimations calculées */
  estimations: {
    loyerMensuelEstime?: number
    rendementBrut?: number
    coutEnergieAnnuel?: number
    budgetTravauxEstime?: number
  }
  /** Points forts et d'attention */
  avantages: string[]
  attentions: string[]
  conseilPerso: string
  /** Enrichissement DVF */
  marche?: {
    ecartPrixM2?: number
    evolution12Mois?: number
    prixM2MedianMarche?: number
    nbTransactions?: number
  }
  /** Enrichissement Géorisques */
  risques?: {
    scoreRisque?: number
    zoneInondable?: boolean
    niveauRadon?: number
  }
  /** Enrichissement Quartier OSM */
  quartier?: {
    scoreQuartier?: number
    transports?: number
    commerces?: number
    ecoles?: number
    sante?: number
    espaceVerts?: number
  }
}

/** Corps de la requête */
interface ComparaisonRequest {
  biens: BienComparaisonPrompt[]
  budgetMax?: number | null
  syntheseDeterministe?: string
}

/** Réponse de l'IA */
interface ComparaisonResponse {
  synthese: string
  verdictFinal: string
  conseilNego: string
  cliffhanger: string
}

// ============================================
// EXEMPLES FEW-SHOT COMPARAISON
// ============================================

const EXEMPLES_COMPARAISON = `
EXEMPLES D'ANALYSES COMPARATIVES DE QUALITÉ (pour t'inspirer du niveau de détail et du ton) :

Exemple 1 — 2 appartements, budget 320k€ :
Bien A : 75 m², 285k€ (3 800 €/m²), DPE D, 3P, Villeurbanne, score 72/100
Bien B : 62 m², 310k€ (5 000 €/m²), DPE B, 3P, Lyon 3e, score 68/100

"L'écart de 4 points cache une réalité plus nuancée. Le bien A à Villeurbanne affiche 1 200 €/m² de moins que le marché lyonnais — c'est votre meilleur levier prix. Mais le DPE D implique 15-25k€ de travaux isolation que le B en DPE B vous évite. Calcul brut : A à 285k€ + 20k€ travaux = 305k€ pour 75 m² vs B à 310k€ pour 62 m². Le A revient à 4 067 €/m² tout compris, le B à 5 000 €/m² — le A garde l'avantage de 23%. Côté revente, le B en Lyon 3e a un bassin plus large d'acheteurs."
Verdict : "Privilégiez le A si vous cherchez l'espace et la marge financière. Le B si l'emplacement prime."
Conseil négo : "Sur le A, ciblez -3% en argumentant le DPE D et les travaux à prévoir (~20k€)."
Cliffhanger : "Un montage avec travaux déductibles (dispositif Denormandie) pourrait transformer le DPE D du bien A en avantage fiscal — mais seuls certains biens y sont éligibles. Vous voulez vérifier ?"

Exemple 2 — 3 maisons, budget 400k€ :
Bien A : maison 110 m², 375k€, DPE C, 5P, score 65/100
Bien B : maison 95 m², 340k€, DPE E, 4P, score 58/100
Bien C : maison 120 m², 390k€, DPE D, 5P, score 70/100

"Le C domine : 120 m² pour 3 250 €/m² contre 3 409 €/m² pour le A et 3 579 €/m² pour le B — c'est le meilleur rapport surface/prix. Attention au B : DPE E avec 95 m² signifie ~2 200 €/an d'énergie et une location interdite sans travaux d'ici 2028. Budget travaux estimé : 25-35k€, ce qui porte le coût réel à 365-375k€ pour seulement 4 pièces. Le A est le compromis sûr : DPE C, 5 pièces, pas de travaux urgents. Le C offre le meilleur potentiel si le quartier tient ses scores (vérifiez transports et commerces en visite)."
Verdict : "Le C pour le meilleur rapport m²/€, le A pour la sécurité, éliminez le B sauf si le prix descend sous 310k€."
Conseil négo : "Le B en DPE E se négocie facilement -5 à -8% en présentant les devis travaux au vendeur."
Cliffhanger : "Saviez-vous qu'en achetant le B avec travaux, vous pourriez être éligible à MaPrimeRénov' (jusqu'à 10k€) ET au PTZ rénovation — mais les conditions changent au 1er janvier ?"
`

// ============================================
// SYSTEM PROMPT — COMPARAISON
// ============================================

const SYSTEM_PROMPT_COMPARAISON = `Tu es analyste immobilier comparatif senior chez AQUIZ. Tu aides des acheteurs français à choisir entre plusieurs biens immobiliers.

${EXPERTISE_IMMOBILIER}

${TON_EXPERT_IMMO}

TA MISSION — ANALYSE COMPARATIVE DE BIENS :
L'acheteur hésite entre ${'{N}'} biens. Tu reçois pour CHACUN : le scoring professionnel 10 axes (0-100), les estimations financières, les données marché DVF, les risques Géorisques, le score quartier, et les points forts/faibles identifiés.

Les scores et chiffres sont DÉJÀ en graphiques sur la page. NE LES RÉCITE PAS. Ton rôle est d'INTERPRÉTER et de COMPARER.

TU DOIS :
1. COMPARER les biens entre eux sur ce qui DIFFÉRENCIE vraiment (pas lister chaque bien séparément)
2. IDENTIFIER le meilleur rapport qualité-prix avec un calcul CONCRET (prix réel = prix affiché + travaux estimés, ramenés au m²)
3. RÉVÉLER ce que les chiffres cachent : un DPE E cache 25k€ de travaux, un bon score quartier = facilité revente, une zone inondable = surcoût assurance
4. DONNER un verdict TRANCHÉ mais nuancé par profil (investisseur vs résidence principale)
5. PROPOSER une stratégie de négociation PRÉCISE sur au moins un bien
6. TERMINER par un cliffhanger SPÉCIFIQUE à cette comparaison

RÈGLES STRICTES :
- PAS de score chiffré dans le texte (ils sont déjà affichés)
- PAS de liste de caractéristiques (prix, surface) — l'acheteur les voit
- PAS de "le bien A est un bon choix" sans justification comparative
- OBLIGATOIRE : au moins 1 calcul chiffré (coût réel, économie, rendement comparé)
- OBLIGATOIRE : au moins 1 insight que l'acheteur n'a PAS vu
- Longueur synthèse : 100-180 mots. Dense, pas de remplissage.

${EXEMPLES_COMPARAISON}

RÉPONSE en JSON strict :
{
  "synthese": "[100-180 mots — analyse comparative, PAS résumé de chaque bien]",
  "verdictFinal": "[1-2 phrases — verdict tranché avec nuance par profil]",
  "conseilNego": "[1-2 phrases — stratégie négociation chiffrée sur UN bien]",
  "cliffhanger": "[1 question spécifique à cette comparaison qui donne envie d'appeler]"
}`

// ============================================
// PROMPT BUILDER
// ============================================

function buildUserPrompt(data: ComparaisonRequest): string {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)

  let prompt = `COMPARAISON DE ${data.biens.length} BIENS IMMOBILIERS\n`

  if (data.budgetMax) {
    prompt += `Budget max acheteur : ${fmt(data.budgetMax)} €\n`
  }

  prompt += '\n'

  data.biens.forEach((bien, i) => {
    const label = `BIEN ${i + 1} (Rang ${bien.rang})`
    prompt += `═══ ${label} — ${bien.titre} ═══\n`
    prompt += `Prix : ${fmt(bien.prix)} € | ${fmt(bien.prixM2)} €/m² | ${bien.surface} m² | ${bien.type} ${bien.pieces}P/${bien.chambres} ch.\n`
    prompt += `Ville : ${bien.ville} (${bien.codePostal}) | DPE : ${bien.dpe}`
    if (bien.etage !== undefined) prompt += ` | Étage ${bien.etage}`
    if (bien.anneeConstruction) prompt += ` | Construction ${bien.anneeConstruction}`
    prompt += '\n'

    // Équipements
    const equips: string[] = []
    if (bien.parking) equips.push('parking')
    if (bien.balconTerrasse) equips.push('balcon/terrasse')
    if (bien.cave) equips.push('cave')
    if (bien.ascenseur) equips.push('ascenseur')
    if (equips.length > 0) {
      prompt += `Équipements : ${equips.join(', ')}\n`
    }

    // Charges
    if (bien.chargesMensuelles || bien.taxeFonciere) {
      const parts: string[] = []
      if (bien.chargesMensuelles) parts.push(`charges ${bien.chargesMensuelles} €/mois`)
      if (bien.taxeFonciere) parts.push(`taxe foncière ${fmt(bien.taxeFonciere)} €/an`)
      prompt += `Charges : ${parts.join(' + ')}\n`
    }

    // Score et verdict
    prompt += `Score global : ${bien.scoreGlobal}/100 (${bien.verdict}) — confiance ${bien.confiance}%\n`

    // Axes de scoring (seulement les plus significatifs)
    const axesSorted = [...bien.axes].sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
    const topAxes = axesSorted.slice(0, 6)
    prompt += `Axes clés : ${topAxes.map(a => `${a.label} ${a.score}/100 (${a.impact})`).join(' | ')}\n`

    // Estimations
    const est = bien.estimations
    const estParts: string[] = []
    if (est.loyerMensuelEstime) estParts.push(`loyer estimé ${est.loyerMensuelEstime} €/mois`)
    if (est.rendementBrut) estParts.push(`rendement ${est.rendementBrut}%`)
    if (est.coutEnergieAnnuel) estParts.push(`énergie ${fmt(est.coutEnergieAnnuel)} €/an`)
    if (est.budgetTravauxEstime) estParts.push(`travaux estimés ${fmt(est.budgetTravauxEstime)} €`)
    if (estParts.length > 0) {
      prompt += `Estimations : ${estParts.join(' | ')}\n`
    }

    // Points clés
    if (bien.avantages.length > 0) {
      prompt += `Points forts : ${bien.avantages.slice(0, 4).join(' ; ')}\n`
    }
    if (bien.attentions.length > 0) {
      prompt += `Vigilances : ${bien.attentions.slice(0, 4).join(' ; ')}\n`
    }

    // Enrichissement marché DVF
    if (bien.marche) {
      const marcheParts: string[] = []
      if (bien.marche.ecartPrixM2 !== undefined) {
        marcheParts.push(`écart ${bien.marche.ecartPrixM2 > 0 ? '+' : ''}${bien.marche.ecartPrixM2.toFixed(0)}% vs médiane DVF`)
      }
      if (bien.marche.prixM2MedianMarche) {
        marcheParts.push(`médiane secteur ${fmt(bien.marche.prixM2MedianMarche)} €/m²`)
      }
      if (bien.marche.evolution12Mois !== undefined) {
        marcheParts.push(`évolution 12 mois : ${bien.marche.evolution12Mois > 0 ? '+' : ''}${bien.marche.evolution12Mois.toFixed(1)}%`)
      }
      if (bien.marche.nbTransactions) {
        marcheParts.push(`${bien.marche.nbTransactions} transactions`)
      }
      if (marcheParts.length > 0) {
        prompt += `Marché DVF : ${marcheParts.join(' | ')}\n`
      }
    }

    // Enrichissement risques
    if (bien.risques) {
      const risquesParts: string[] = []
      if (bien.risques.scoreRisque !== undefined) risquesParts.push(`score sécurité ${bien.risques.scoreRisque}/100`)
      if (bien.risques.zoneInondable) risquesParts.push('ZONE INONDABLE')
      if (bien.risques.niveauRadon && bien.risques.niveauRadon >= 2) risquesParts.push(`radon cat. ${bien.risques.niveauRadon}`)
      if (risquesParts.length > 0) {
        prompt += `Risques : ${risquesParts.join(' | ')}\n`
      }
    }

    // Enrichissement quartier
    if (bien.quartier && bien.quartier.scoreQuartier !== undefined) {
      const qParts: string[] = [`global ${bien.quartier.scoreQuartier}/100`]
      if (bien.quartier.transports !== undefined) qParts.push(`transports ${bien.quartier.transports}/100`)
      if (bien.quartier.commerces !== undefined) qParts.push(`commerces ${bien.quartier.commerces}/100`)
      if (bien.quartier.ecoles !== undefined) qParts.push(`écoles ${bien.quartier.ecoles}/100`)
      prompt += `Quartier : ${qParts.join(' | ')}\n`
    }

    prompt += '\n'
  })

  // Contexte comparatif clé
  const prixMin = Math.min(...data.biens.map(b => b.prix))
  const prixMax = Math.max(...data.biens.map(b => b.prix))
  const prixM2s = data.biens.map(b => b.prixM2)
  const ecartScores = Math.max(...data.biens.map(b => b.scoreGlobal)) - Math.min(...data.biens.map(b => b.scoreGlobal))

  prompt += `SYNTHÈSE COMPARATIVE :\n`
  prompt += `- Fourchette prix : ${fmt(prixMin)} à ${fmt(prixMax)} € (écart ${fmt(prixMax - prixMin)} €)\n`
  prompt += `- Fourchette prix/m² : ${fmt(Math.min(...prixM2s))} à ${fmt(Math.max(...prixM2s))} €/m²\n`
  prompt += `- Écart scores : ${ecartScores} points\n`

  const passoireCount = data.biens.filter(b => b.dpe === 'F' || b.dpe === 'G').length
  if (passoireCount > 0) {
    prompt += `- ${passoireCount} passoire(s) thermique(s) dans la sélection\n`
  }

  const inondableCount = data.biens.filter(b => b.risques?.zoneInondable).length
  if (inondableCount > 0) {
    prompt += `- ${inondableCount} bien(s) en zone inondable\n`
  }

  return prompt
}

// ============================================
// HANDLER
// ============================================

export async function POST(request: Request) {
  // Rate limit
  const ip = getClientIP(request.headers)
  const rl = checkRateLimit(`synthese-ia-comparaison:${ip}`, {
    maxRequests: 15,
    windowMs: RATE_LIMITS.analyse.windowMs,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Réessayez dans un instant.' },
      { status: 429 }
    )
  }

  // Parse body
  let body: ComparaisonRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Corps de requête invalide' },
      { status: 400 }
    )
  }

  // Validate
  if (!body.biens || body.biens.length < 1 || body.biens.length > 4) {
    return NextResponse.json(
      { success: false, error: 'Entre 1 et 4 biens requis' },
      { status: 400 }
    )
  }

  // Build the prompts
  const userPrompt = buildUserPrompt(body)
  const systemPrompt = SYSTEM_PROMPT_COMPARAISON.replace('{N}', String(body.biens.length))

  const mistralKey = process.env.MISTRAL_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (!mistralKey && !groqKey) {
    return NextResponse.json({
      success: true,
      data: generateFallbackComparaison(body),
      source: 'deterministe',
    })
  }

  try {
    let raw: string | null = null
    let source = 'unknown'

    if (mistralKey) {
      const mistral = new Mistral({ apiKey: mistralKey })
      const completion = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.7,
        maxTokens: 800,
      })
      raw = completion.choices?.[0]?.message?.content as string | null
      source = 'mistral-large'
    } else if (groqKey) {
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
        max_tokens: 800,
      })
      raw = completion.choices[0]?.message?.content ?? null
      source = 'groq-llama-3.3-70b'
    }

    if (!raw) throw new Error('Réponse vide')

    const parsed = JSON.parse(raw) as ComparaisonResponse

    // Sanitize
    if (!parsed.synthese || !parsed.cliffhanger) {
      throw new Error('Format inattendu')
    }

    return NextResponse.json({
      success: true,
      data: {
        synthese: parsed.synthese.slice(0, 900),
        verdictFinal: (parsed.verdictFinal || '').slice(0, 300),
        conseilNego: (parsed.conseilNego || '').slice(0, 300),
        cliffhanger: parsed.cliffhanger.slice(0, 300),
      },
      source,
    })
  } catch (err) {
    console.error('[synthese-ia-comparaison] IA error, fallback:', err)
    return NextResponse.json({
      success: true,
      data: generateFallbackComparaison(body),
      source: 'deterministe-fallback',
    })
  }
}

// ============================================
// FALLBACK DÉTERMINISTE
// ============================================

function generateFallbackComparaison(data: ComparaisonRequest): ComparaisonResponse {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
  const biens = data.biens.sort((a, b) => a.rang - b.rang)
  const meilleur = biens[0]
  const deuxieme = biens[1]

  if (biens.length === 1) {
    const b = biens[0]
    const coutReel = b.prix + (b.estimations.budgetTravauxEstime || 0)
    return {
      synthese: `Ce ${b.type} de ${b.surface} m² à ${b.ville} affiche un score de ${b.scoreGlobal}/100. ${b.estimations.budgetTravauxEstime ? `Coût réel estimé (prix + travaux) : ${fmt(coutReel)} €, soit ${fmt(Math.round(coutReel / b.surface))} €/m² tout compris.` : `À ${fmt(b.prixM2)} €/m², le prix est ${b.marche?.ecartPrixM2 !== undefined ? (b.marche.ecartPrixM2 > 5 ? 'au-dessus du marché' : b.marche.ecartPrixM2 < -5 ? 'en dessous du marché' : 'aligné au marché') : 'à évaluer vs le marché local'}.`} ${b.avantages[0] ? `Point fort : ${b.avantages[0].toLowerCase()}.` : ''}`,
      verdictFinal: `${b.verdict} — ${b.estimations.rendementBrut ? `rendement locatif estimé ${b.estimations.rendementBrut}%.` : 'à visiter pour confirmer le potentiel.'}`,
      conseilNego: b.marche?.ecartPrixM2 !== undefined && b.marche.ecartPrixM2 > 5
        ? `Marge de négociation estimée : ${Math.min(b.marche.ecartPrixM2, 10).toFixed(0)}% soit ~${fmt(Math.round(b.prix * Math.min(b.marche.ecartPrixM2, 10) / 100))} €.`
        : 'Demandez l\'historique du bien et les dernières offres pour calibrer votre négociation.',
      cliffhanger: 'Un conseiller AQUIZ peut identifier les leviers de négociation spécifiques à ce bien et optimiser votre montage financier.',
    }
  }

  // Multi-biens
  const ecart = meilleur.scoreGlobal - (deuxieme?.scoreGlobal || 0)

  // Calcul coût réel comparé
  const coutsReels = biens.map(b => ({
    ...b,
    coutReel: b.prix + (b.estimations.budgetTravauxEstime || 0),
    prixM2Reel: Math.round((b.prix + (b.estimations.budgetTravauxEstime || 0)) / b.surface),
  }))
  const meilleurRapport = coutsReels.sort((a, b) => a.prixM2Reel - b.prixM2Reel)[0]

  const parts: string[] = []

  if (ecart >= 10) {
    parts.push(`Le bien classé 1er se démarque nettement avec ${ecart} points d'avance.`)
  } else if (ecart >= 4) {
    parts.push(`Léger avantage pour le 1er bien, mais les scores restent proches.`)
  } else {
    parts.push(`Sélection très homogène — ${ecart} point${ecart > 1 ? 's' : ''} d'écart seulement.`)
  }

  // Coût réel
  if (meilleurRapport.estimations.budgetTravauxEstime) {
    parts.push(`En coût réel (prix + travaux), ${meilleurRapport.titre.split(' ').slice(0, 3).join(' ')} revient à ${fmt(meilleurRapport.prixM2Reel)} €/m² tout compris.`)
  }

  // Passoire thermique
  const passoires = biens.filter(b => b.dpe === 'F' || b.dpe === 'G')
  if (passoires.length > 0) {
    parts.push(`Attention : ${passoires.length} bien${passoires.length > 1 ? 's' : ''} en DPE ${passoires.map(p => p.dpe).join('/')} — travaux énergie obligatoires.`)
  }

  // Meilleur rendement
  const rendementsDispos = biens.filter(b => b.estimations.rendementBrut)
  if (rendementsDispos.length >= 2) {
    const bestRendement = rendementsDispos.sort((a, b) => (b.estimations.rendementBrut || 0) - (a.estimations.rendementBrut || 0))[0]
    parts.push(`Meilleur rendement locatif : ${bestRendement.estimations.rendementBrut}% brut.`)
  }

  // Négociation
  const bienNegociable = biens.find(b => b.marche?.ecartPrixM2 !== undefined && b.marche.ecartPrixM2 > 5)
  const conseilNego = bienNegociable
    ? `Le bien à ${bienNegociable.ville} est ${bienNegociable.marche!.ecartPrixM2!.toFixed(0)}% au-dessus du marché — marge de négociation de ${Math.min(bienNegociable.marche!.ecartPrixM2!, 10).toFixed(0)}% soit ~${fmt(Math.round(bienNegociable.prix * Math.min(bienNegociable.marche!.ecartPrixM2!, 10) / 100))} €.`
    : 'Comparez les prix/m² avec les dernières ventes DVF du quartier pour argumenter votre offre.'

  return {
    synthese: parts.join(' '),
    verdictFinal: ecart >= 8
      ? `Privilégiez le 1er pour la sécurité du choix. Le 2e reste une alternative si le prix baisse.`
      : `Scores proches — visitez les deux et laissez votre ressenti trancher. Le rapport qualité-prix fera la différence.`,
    conseilNego,
    cliffhanger: 'Un conseiller AQUIZ peut négocier le prix de ces biens et optimiser votre montage financier avec accès à 30+ banques.',
  }
}
