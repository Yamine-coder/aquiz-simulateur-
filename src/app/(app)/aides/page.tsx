'use client'

/**
 * Page Aides & PTZ — Clean UI/UX
 * 
 * Deux modes d'accès :
 * 1. Via le menu "Nos outils" → sélection de département (landing page)
 * 2. Via le parcours Simulateur → Carte → Zone → Aides (données du store)
 */

import { ContactModal } from '@/components/contact'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    calculerTotalAides,
    filtrerAidesParProfil,
    grouperAidesParCategorie,
    LABELS_CATEGORIES,
    type AideAccession,
    type CategorieAide
} from '@/data/aides-accession'
import { useSimulateurStore } from '@/stores/useSimulateurStore'
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    Calculator,
    CheckCircle,
    ChevronDown,
    ExternalLink,
    FileCheck,
    Gift,
    Hammer,
    Info,
    MapPin,
    MapPinned,
    Percent,
    Phone,
    Star
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

// =====================================================
// CONSTANTS
// =====================================================

const DEPARTEMENTS_IDF = [
  { code: '75', nom: 'Paris', zone: 'Abis', cp: '75001', desc: 'Capitale' },
  { code: '92', nom: 'Hauts-de-Seine', zone: 'Abis', cp: '92000', desc: 'Petite couronne' },
  { code: '93', nom: 'Seine-Saint-Denis', zone: 'A', cp: '93000', desc: 'Petite couronne' },
  { code: '94', nom: 'Val-de-Marne', zone: 'A', cp: '94000', desc: 'Petite couronne' },
  { code: '78', nom: 'Yvelines', zone: 'A', cp: '78000', desc: 'Grande couronne' },
  { code: '91', nom: 'Essonne', zone: 'A', cp: '91000', desc: 'Grande couronne' },
  { code: '77', nom: 'Seine-et-Marne', zone: 'B1', cp: '77000', desc: 'Grande couronne' },
  { code: '95', nom: "Val-d'Oise", zone: 'A', cp: '95000', desc: 'Grande couronne' },
] as const

type ZoneCode = 'Abis' | 'A' | 'B1'

const ZONE_COLORS: Record<ZoneCode, string> = {
  Abis: 'bg-aquiz-green text-white',
  A: 'bg-blue-500 text-white',
  B1: 'bg-amber-500 text-white',
}

const ICONES_CATEGORIES: Record<CategorieAide, React.ReactNode> = {
  pret_aide: <Banknote className="w-4 h-4" />,
  avantage_fiscal: <Percent className="w-4 h-4" />,
  subvention: <Gift className="w-4 h-4" />,
  dispositif_accession: <FileCheck className="w-4 h-4" />,
  aide_travaux: <Hammer className="w-4 h-4" />,
  aide_locale: <MapPinned className="w-4 h-4" />
}

const COULEURS_CATEGORIES: Record<CategorieAide, { bg: string; text: string; icon: string; border: string }> = {
  pret_aide: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600', border: 'border-emerald-100' },
  avantage_fiscal: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600', border: 'border-amber-100' },
  subvention: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600', border: 'border-emerald-100' },
  dispositif_accession: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', border: 'border-blue-100' },
  aide_travaux: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600', border: 'border-orange-100' },
  aide_locale: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-600', border: 'border-violet-100' }
}

const formatMontant = (n: number): string => n.toLocaleString('fr-FR')

// =====================================================
// COMPOSANT : Landing page sélection département
// =====================================================

function SelecteurDepartement({ onSelect }: { onSelect: (code: string) => void }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero — épuré, centré, aéré */}
      <section className="pt-12 pb-10 md:pt-20 md:pb-14 border-b border-aquiz-gray-lighter">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aquiz-green/8 text-aquiz-green text-xs font-medium mb-5">
            <MapPin className="w-3 h-3" />
            Île-de-France
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-aquiz-black tracking-tight leading-tight">
            Les aides pour devenir propriétaire
          </h1>
          <p className="mt-3 text-base text-aquiz-gray-light max-w-md mx-auto leading-relaxed">
            PTZ, Action Logement, aides locales… découvrez les dispositifs accessibles dans votre département.
          </p>
        </div>
      </section>

      {/* Grille de départements */}
      <section className="max-w-2xl mx-auto px-5 py-10 md:py-14">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-medium text-aquiz-gray-light uppercase tracking-widest">Sélectionnez un département</p>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-aquiz-green" /><span className="text-aquiz-gray">Abis</span></span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /><span className="text-aquiz-gray">A</span></span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-aquiz-gray">B1</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DEPARTEMENTS_IDF.map((dept) => (
            <button
              key={dept.code}
              onClick={() => onSelect(dept.code)}
              className="group flex items-center gap-4 p-4 rounded-xl border border-aquiz-gray-lighter bg-white hover:border-aquiz-gray-light hover:shadow-sm transition-all duration-150 text-left active:scale-[0.99]"
            >
              <div className="w-11 h-11 rounded-xl bg-aquiz-gray-lightest group-hover:bg-aquiz-green/8 flex items-center justify-center transition-colors">
                <span className="text-base font-bold text-aquiz-gray-dark group-hover:text-aquiz-green transition-colors">
                  {dept.code}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-aquiz-black">{dept.nom}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ZONE_COLORS[dept.zone as ZoneCode]}`}
                    title={dept.zone === 'Abis' ? 'Zone Abis — marché très tendu, plafonds PTZ les plus élevés' : dept.zone === 'A' ? 'Zone A — marché tendu, plafonds PTZ élevés' : 'Zone B1 — marché modéré, plafonds PTZ intermédiaires'}
                  >
                    {dept.zone}
                  </span>
                </div>
                <span className="text-xs text-aquiz-gray-light">{dept.desc}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-aquiz-gray-lighter group-hover:text-aquiz-green transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* Bloc éducatif minimal */}
      <section className="border-t border-aquiz-gray-lighter bg-aquiz-gray-lightest/50">
        <div className="max-w-2xl mx-auto px-5 py-10 md:py-14">
          <p className="text-xs font-medium text-aquiz-gray-light uppercase tracking-widest mb-6">Principales aides</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <Banknote className="w-5 h-5" />, title: 'PTZ', amount: 'Jusqu\'à 50% sans intérêts', desc: 'Prêt à Taux Zéro pour les primo-accédants' },
              { icon: <FileCheck className="w-5 h-5" />, title: 'Action Logement', amount: 'Jusqu\'à 40 000 €', desc: 'Prêt à taux réduit pour les salariés du privé' },
              { icon: <Percent className="w-5 h-5" />, title: 'TVA réduite', amount: '5,5% au lieu de 20%', desc: 'En zone ANRU pour les primo-accédants' },
              { icon: <MapPinned className="w-5 h-5" />, title: 'Aides locales', amount: 'Variable', desc: 'Subventions département et commune' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl bg-white border border-aquiz-gray-lighter">
                <div className="text-aquiz-gray-light shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-aquiz-black">{item.title}</span>
                    <span className="text-xs font-medium text-aquiz-green">{item.amount}</span>
                  </div>
                  <p className="text-xs text-aquiz-gray-light leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA en bas */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 p-5 rounded-xl bg-white border border-aquiz-gray-lighter">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-aquiz-black">Résultats personnalisés</p>
              <p className="text-xs text-aquiz-gray-light mt-0.5">Simulez votre capacité pour obtenir des aides adaptées</p>
            </div>
            <Button asChild size="sm" className="bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl h-9 text-xs font-semibold shadow-none">
              <Link href="/simulateur/mode-a">
                <Calculator className="w-3.5 h-3.5 mr-1.5" />
                Simuler
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

// =====================================================
// COMPOSANT : Carte d'aide individuelle
// =====================================================

function AideCard({ aide, expanded, onToggle }: {
  aide: AideAccession
  expanded: boolean
  onToggle: () => void
}) {
  const colors = COULEURS_CATEGORIES[aide.categorie]

  return (
    <div className={`bg-white rounded-xl border transition-all duration-150 ${
      expanded ? 'border-aquiz-gray-lighter shadow-sm' : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light'
    }`}>
      <button onClick={onToggle} className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-start gap-3.5 text-left">
        <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center shrink-0 ${colors.icon}`}>
          {ICONES_CATEGORIES[aide.categorie]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="font-semibold text-aquiz-black text-sm leading-tight">{aide.nom}</h3>
            {aide.taux === 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-aquiz-green/10 text-aquiz-green rounded font-semibold">0%</span>
            )}
          </div>
          <p className="text-xs text-aquiz-gray-light line-clamp-1">{aide.description}</p>
          {aide.montant && (
            <p className="text-sm font-bold text-aquiz-green mt-1.5">
              {aide.montant.max
                ? `Jusqu'à ${formatMontant(aide.montant.max)} €`
                : aide.montant.calcul
              }
            </p>
          )}
        </div>

        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
          expanded ? 'rotate-180 bg-aquiz-black text-white' : 'bg-aquiz-gray-lightest text-aquiz-gray-light'
        }`}>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-4 animate-fade-in">
          <div className="h-px bg-aquiz-gray-lighter" />

          {/* Avantages */}
          <div>
            <p className="text-[10px] text-aquiz-gray-light uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
              <Star className="w-3 h-3 text-amber-400" />
              Avantages
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {aide.avantages.map((avantage, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-aquiz-green shrink-0 mt-0.5" />
                  <span className="text-aquiz-gray">{avantage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <p className="text-[10px] text-aquiz-gray-light uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
              <Info className="w-3 h-3 text-blue-400" />
              Conditions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {aide.conditions.primoAccedant && (
                <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-medium">Primo-accédant</span>
              )}
              {aide.conditions.plafondRevenus && (
                <span className="text-[10px] px-2 py-1 bg-purple-50 text-purple-600 rounded-md font-medium">Sous plafond revenus</span>
              )}
              {aide.conditions.salariePriveMin10 && (
                <span className="text-[10px] px-2 py-1 bg-orange-50 text-orange-600 rounded-md font-medium">Salarié privé (10+ sal.)</span>
              )}
              {aide.conditions.residencePrincipale && (
                <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md font-medium">Résidence principale</span>
              )}
              {aide.conditions.typeBien && (
                <span className="text-[10px] px-2 py-1 bg-aquiz-gray-lightest text-aquiz-gray rounded-md font-medium">
                  {aide.conditions.typeBien.join(' / ')}
                </span>
              )}
              {aide.conditions.zoneANRU && (
                <span className="text-[10px] px-2 py-1 bg-red-50 text-red-500 rounded-md font-medium">Zone ANRU/QPV</span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-aquiz-gray-lighter">
            <span className="text-[10px] text-aquiz-gray-light">{aide.organisme}</span>
            <a
              href={aide.urlOfficielle}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-aquiz-green hover:underline flex items-center gap-1 font-medium"
            >
              En savoir plus
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function AidesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { zoneSelectionnee: zoneStore, profil, parametresModeA, resultats } = useSimulateurStore()

  const fromCarte = searchParams.get('from') === 'carte'
  const effectiveStoreZone = fromCarte ? zoneStore : null

  const [localZone, setLocalZone] = useState<{
    nomCommune: string
    codeDepartement: string
    codePostal: string
    zonePTZ: string
  } | null>(null)

  const handleSelectDept = useCallback((codeDept: string) => {
    const dept = DEPARTEMENTS_IDF.find(d => d.code === codeDept)
    if (dept) {
      setLocalZone({
        nomCommune: dept.nom,
        codeDepartement: dept.code,
        codePostal: dept.cp,
        zonePTZ: dept.zone,
      })
    }
  }, [])

  const zoneSelectionnee = effectiveStoreZone || localZone
  const fromStore = !!effectiveStoreZone

  const [salariePriveMin10, setSalariePriveMin10] = useState('non')
  const [fonctionnaire, setFonctionnaire] = useState('non')
  const [primoAccedant, setPrimoAccedant] = useState('oui')
  const [expandedAides, setExpandedAides] = useState<Set<string>>(new Set(['ptz', 'action_logement']))
  const [activeCategory, setActiveCategory] = useState<CategorieAide | 'all'>('all')
  const [showContactModal, setShowContactModal] = useState(false)

  const typeBien = parametresModeA?.typeBien || 'neuf'
  const revenusAnnuels = (profil?.revenusMensuelsTotal || 0) * 12
  const capaciteAchat = resultats?.prixAchatMax || ((resultats?.capaciteEmprunt || 0) + (parametresModeA?.apport || 0))
  const estFonctionnaire = profil?.statutProfessionnel === 'fonctionnaire'

  const aidesEligibles = useMemo(() => {
    if (!zoneSelectionnee) return []
    const cp = 'codePostal' in zoneSelectionnee ? zoneSelectionnee.codePostal : undefined
    return filtrerAidesParProfil({
      codePostal: cp || undefined,
      primoAccedant: primoAccedant === 'oui',
      revenus: revenusAnnuels || undefined,
      typeBien,
      salariePriveMin10: salariePriveMin10 === 'oui',
      fonctionnaire: fonctionnaire === 'oui' || estFonctionnaire,
      age: profil?.age || undefined
    })
  }, [zoneSelectionnee, primoAccedant, revenusAnnuels, typeBien, salariePriveMin10, fonctionnaire, estFonctionnaire, profil?.age])

  const aidesParCategorie = useMemo(() => grouperAidesParCategorie(aidesEligibles), [aidesEligibles])
  const totalAides = useMemo(() => calculerTotalAides(aidesEligibles), [aidesEligibles])

  const countParCategorie = useMemo(() => {
    const counts: Record<CategorieAide, number> = {
      pret_aide: 0, avantage_fiscal: 0, subvention: 0,
      dispositif_accession: 0, aide_travaux: 0, aide_locale: 0
    }
    Object.entries(aidesParCategorie).forEach(([cat, aides]) => {
      counts[cat as CategorieAide] = aides.length
    })
    return counts
  }, [aidesParCategorie])

  const aidesToShow = activeCategory === 'all' ? aidesEligibles : aidesParCategorie[activeCategory]

  const toggleAide = (id: string) => {
    setExpandedAides(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ===== MODE 1 : Pas de zone → Sélecteur =====
  if (!zoneSelectionnee) {
    return <SelecteurDepartement onSelect={handleSelectDept} />
  }

  const zonePTZ = zoneSelectionnee.zonePTZ as ZoneCode

  // ===== MODE 2 : Zone sélectionnée → Aides =====
  return (
    <div className="min-h-screen bg-white">
      {/* Header — clean, minimal */}
      <header className="border-b border-aquiz-gray-lighter">
        <div className="max-w-2xl mx-auto px-5 py-5 md:py-6">
          {/* Navigation retour */}
          <button
            onClick={() => fromStore ? router.push('/carte') : setLocalZone(null)}
            className="inline-flex items-center gap-1.5 text-xs text-aquiz-gray-light hover:text-aquiz-gray transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {fromStore ? 'Retour à la carte' : 'Tous les départements'}
          </button>

          {/* Titre + badge zone */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-aquiz-black tracking-tight">
                {zoneSelectionnee.nomCommune}
              </h1>
              <p className="text-sm text-aquiz-gray-light mt-0.5">
                Département {zoneSelectionnee.codeDepartement}
                {fromStore && capaciteAchat > 0 ? ` · Budget ${formatMontant(capaciteAchat)} €` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${ZONE_COLORS[zonePTZ] || ZONE_COLORS.A}`}>
                Zone {zoneSelectionnee.zonePTZ}
              </span>
              <span className="text-[10px] text-aquiz-gray-light">
                {zonePTZ === 'Abis' ? 'Marché très tendu' : zonePTZ === 'A' ? 'Marché tendu' : 'Marché modéré'}
              </span>
            </div>
          </div>

          {/* Métriques — ligne horizontale */}
          <div className="flex items-center gap-6 mt-5 pt-5 border-t border-aquiz-gray-lighter">
            <div>
              <span className="text-2xl font-extrabold text-aquiz-black">{aidesEligibles.length}</span>
              <span className="text-xs text-aquiz-gray-light ml-1.5">aides disponibles</span>
            </div>
            {totalAides.max > 0 && (
              <div>
                <span className="text-2xl font-extrabold text-aquiz-green">{(totalAides.max / 1000).toFixed(0)}k€</span>
                <span className="text-xs text-aquiz-gray-light ml-1.5">d&apos;économies max</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contenu */}
      <div className="max-w-2xl mx-auto px-5 py-6">

        {/* Filtres profil — compact, inline */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 mb-6 pb-6 border-b border-aquiz-gray-lighter">
          <span className="text-xs font-medium text-aquiz-gray-light uppercase tracking-wider">Profil</span>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-aquiz-gray" title="Primo-accédant : personne qui achète sa résidence principale pour la première fois (ou qui n'a pas été propriétaire depuis 2 ans)">Primo <Info className="w-3 h-3 inline text-aquiz-gray-light" /></Label>
            <Select value={primoAccedant} onValueChange={setPrimoAccedant}>
              <SelectTrigger className="w-16 h-7 text-xs rounded-lg border-aquiz-gray-lighter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oui">Oui</SelectItem>
                <SelectItem value="non">Non</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-aquiz-gray" title="Salarié d'une entreprise du secteur privé de 10 employés ou plus, condition pour le prêt Action Logement">Salarié 10+ <Info className="w-3 h-3 inline text-aquiz-gray-light" /></Label>
            <Select value={salariePriveMin10} onValueChange={setSalariePriveMin10}>
              <SelectTrigger className="w-16 h-7 text-xs rounded-lg border-aquiz-gray-lighter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oui">Oui</SelectItem>
                <SelectItem value="non">Non</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!estFonctionnaire && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-aquiz-gray">Fonctionnaire</Label>
              <Select value={fonctionnaire} onValueChange={setFonctionnaire}>
                <SelectTrigger className="w-16 h-7 text-xs rounded-lg border-aquiz-gray-lighter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filtres catégorie */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-aquiz-black text-white'
                : 'bg-aquiz-gray-lightest text-aquiz-gray hover:bg-aquiz-gray-lighter'
            }`}
          >
            Toutes ({aidesEligibles.length})
          </button>
          {(Object.keys(LABELS_CATEGORIES) as CategorieAide[])
            .filter(cat => countParCategorie[cat] > 0)
            .map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? 'bg-aquiz-black text-white'
                    : 'bg-aquiz-gray-lightest text-aquiz-gray hover:bg-aquiz-gray-lighter'
                }`}
              >
                {LABELS_CATEGORIES[cat]}
                <span className={`text-[10px] ${
                  activeCategory === cat ? 'text-aquiz-gray-light' : 'text-aquiz-gray-light'
                }`}>
                  {countParCategorie[cat]}
                </span>
              </button>
            ))
          }
        </div>

        {/* Liste des aides */}
        <div className="space-y-2.5 mb-8">
          {aidesToShow.map(aide => (
            <AideCard
              key={aide.id}
              aide={aide}
              expanded={expandedAides.has(aide.id)}
              onToggle={() => toggleAide(aide.id)}
            />
          ))}
          {aidesToShow.length === 0 && (
            <div className="rounded-xl border border-aquiz-gray-lighter p-10 text-center">
              <p className="text-sm text-aquiz-gray-light">Aucune aide dans cette catégorie</p>
            </div>
          )}
        </div>

        {/* CTA Contact */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl bg-aquiz-gray-lightest border border-aquiz-gray-lighter mb-6">
          <div className="w-10 h-10 rounded-xl bg-white border border-aquiz-gray-lighter flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4 text-aquiz-gray-light" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-aquiz-black">
              Besoin d&apos;accompagnement ?
            </p>
            <p className="text-xs text-aquiz-gray-light">
              Un conseiller vous aide à constituer vos dossiers d&apos;aides
            </p>
          </div>
          <Button
            size="sm"
            className="bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl shadow-none font-semibold h-9 text-xs"
            onClick={() => setShowContactModal(true)}
          >
            Être rappelé
            <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Note */}
        <p className="text-[11px] text-aquiz-gray-light text-center mb-4 leading-relaxed">
          Liste indicative · zone {zoneSelectionnee.zonePTZ} · vérifiez l&apos;éligibilité auprès des organismes ou d&apos;un conseiller ADIL
        </p>

        {/* Nav bas */}
        <div className="flex items-center justify-between pt-4 pb-10 border-t border-aquiz-gray-lighter">
          <button
            onClick={() => fromStore ? router.push('/carte') : setLocalZone(null)}
            className="text-xs text-aquiz-gray-light hover:text-aquiz-gray flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {fromStore ? 'Retour à la carte' : 'Tous les départements'}
          </button>
          <Button asChild size="sm" variant="outline" className="rounded-xl border-aquiz-gray-lighter text-xs h-8">
            <Link href="/simulateur/mode-a">
              {fromStore ? 'Récapitulatif' : 'Simuler'}
              <ArrowRight className="ml-1 w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  )
}
