'use client'

/**
 * Page Aides & PTZ — Clean UI/UX
 * 
 * Deux modes d'accès :
 * 1. Via le menu "Nos outils" → sélection de département (landing page)
 * 2. Via le parcours Simulateur → Carte → Zone → Aides (données du store)
 */

import { ContactModal } from '@/components/contact'
import { LeadCaptureGate } from '@/components/lead/LeadCaptureGate'
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
    Shield,
    ShieldCheck,
    Star
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useMemo, useState } from 'react'

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
      {/* Hero — même style que /simulateur */}
      <section className="pt-10 pb-6 md:pt-12 md:pb-8 border-b border-aquiz-gray-lighter">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aquiz-green/8 text-aquiz-green text-xs font-medium mb-3">
            <MapPin className="w-3.5 h-3.5" />
            Île-de-France
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-aquiz-black tracking-tight leading-tight">
            Les aides pour devenir propriétaire
          </h1>
          <p className="mt-2 text-sm md:text-base text-aquiz-gray-light max-w-lg mx-auto leading-relaxed">
            PTZ, Action Logement, aides locales… découvrez les dispositifs accessibles dans votre département.
          </p>
        </div>
      </section>

      {/* Grille de départements */}
      <section className="max-w-3xl mx-auto px-5 py-8 md:py-10">
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
        <div className="max-w-3xl mx-auto px-5 py-8 md:py-10">
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
    <div className={`bg-white rounded-2xl border transition-all duration-150 ${
      expanded ? 'border-aquiz-gray-lighter shadow-md shadow-black/[0.03]' : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light hover:shadow-sm'
    }`}>
      <button onClick={onToggle} className="w-full px-5 py-4 sm:px-6 sm:py-5 flex items-start gap-4 text-left">
        <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center shrink-0 ${colors.icon}`}>
          {ICONES_CATEGORIES[aide.categorie]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h3 className="font-semibold text-aquiz-black text-[15px] leading-tight">{aide.nom}</h3>
            {aide.taux === 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-aquiz-green/10 text-aquiz-green rounded-md font-bold">0%</span>
            )}
          </div>
          <p className="text-xs text-aquiz-gray-light line-clamp-1 leading-relaxed">{aide.description}</p>
          {aide.montant && (
            <p className="text-sm font-bold text-aquiz-green mt-2">
              {aide.montant.max
                ? `Jusqu'à ${formatMontant(aide.montant.max)} €`
                : aide.montant.calcul
              }
            </p>
          )}
        </div>

        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 mt-0.5 ${
          expanded ? 'rotate-180 bg-aquiz-black text-white' : 'bg-aquiz-gray-lightest text-aquiz-gray-light'
        }`}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-5 animate-fade-in">
          <div className="h-px bg-aquiz-gray-lighter" />

          {/* Avantages */}
          <div>
            <p className="text-[11px] text-aquiz-gray-light uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Avantages
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {aide.avantages.map((avantage, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 text-aquiz-green shrink-0 mt-0.5" />
                  <span className="text-aquiz-gray leading-snug">{avantage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <p className="text-[11px] text-aquiz-gray-light uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Conditions
            </p>
            <div className="flex flex-wrap gap-2">
              {aide.conditions.primoAccedant && (
                <span className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">Primo-accédant</span>
              )}
              {aide.conditions.plafondRevenus && (
                <span className="text-[11px] px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full font-medium">Sous plafond revenus</span>
              )}
              {aide.conditions.salariePriveMin10 && (
                <span className="text-[11px] px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full font-medium">Salarié privé (10+ sal.)</span>
              )}
              {aide.conditions.residencePrincipale && (
                <span className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium">Résidence principale</span>
              )}
              {aide.conditions.typeBien && (
                <span className="text-[11px] px-2.5 py-1 bg-aquiz-gray-lightest text-aquiz-gray rounded-full font-medium">
                  {aide.conditions.typeBien.join(' / ')}
                </span>
              )}
              {aide.conditions.zoneANRU && (
                <span className="text-[11px] px-2.5 py-1 bg-red-50 text-red-500 rounded-full font-medium">Zone ANRU/QPV</span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-aquiz-gray-lighter space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-aquiz-gray-light font-medium">{aide.organisme}</span>
              <a
                href={aide.urlOfficielle}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-aquiz-green hover:underline flex items-center gap-1.5 font-medium"
              >
                En savoir plus
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {/* Référence juridique */}
            {aide.sourceJuridique && (
              <div className="flex items-center gap-1.5 text-[10px] text-aquiz-gray-light">
                <Shield className="w-3 h-3 text-aquiz-gray-lighter shrink-0" />
                {aide.sourceLegifrance ? (
                  <a href={aide.sourceLegifrance} target="_blank" rel="noopener noreferrer" className="hover:text-aquiz-gray hover:underline underline-offset-2 transition-colors">
                    {aide.sourceJuridique}
                  </a>
                ) : (
                  <span>{aide.sourceJuridique}</span>
                )}
                {aide.dateVerification && (
                  <span className="text-aquiz-gray-lighter">· Vérifié {new Date(aide.dateVerification).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

function AidesPageContent() {
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
      {/* Header */}
      <header className="border-b border-aquiz-gray-lighter">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 pt-5 pb-4 md:pt-10 md:pb-8">
          {/* Navigation retour */}
          <button
            onClick={() => fromStore ? router.push('/carte') : setLocalZone(null)}
            className="inline-flex items-center gap-1.5 text-xs text-aquiz-gray-light hover:text-aquiz-gray transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {fromStore ? 'Retour à la carte' : 'Tous les départements'}
          </button>

          {/* Carte récap — regroupée */}
          <div className="rounded-xl border border-aquiz-gray-lighter bg-white overflow-hidden">
            {/* Titre + Zone + Métriques */}
            <div className="px-4 sm:px-5 py-3.5 sm:py-4">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-aquiz-black tracking-tight">
                      {zoneSelectionnee.nomCommune}
                    </h2>
                    <span className="text-xs text-aquiz-gray-light font-medium">
                      {zoneSelectionnee.codeDepartement}
                    </span>
                    {fromStore && capaciteAchat > 0 && (
                      <span className="text-xs text-aquiz-gray-light">· Budget {formatMontant(capaciteAchat)} €</span>
                    )}
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${ZONE_COLORS[zonePTZ] || ZONE_COLORS.A}`}>
                  Zone {zoneSelectionnee.zonePTZ}
                </span>
              </div>

              {/* Métriques inline */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-aquiz-gray-lightest border border-aquiz-gray-lighter">
                  <span className="text-sm font-bold text-aquiz-black">{aidesEligibles.length}</span>
                  <span className="text-[10px] text-aquiz-gray-light">aides</span>
                </div>
                {totalAides.max > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-aquiz-green/5 border border-aquiz-green/15">
                    <span className="text-sm font-bold text-aquiz-green">jusqu&apos;à {(totalAides.max / 1000).toFixed(0)}k€</span>
                    <span className="text-[10px] text-aquiz-gray">d&apos;aides cumulées</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filtres profil — séparés visuellement */}
            <div className="px-4 sm:px-5 py-3 border-t border-aquiz-gray-lighter bg-slate-50/50">
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] text-aquiz-gray font-medium cursor-help whitespace-nowrap" title="Premier achat de résidence principale (ou pas propriétaire depuis 2 ans)">
                    Primo <Info className="w-3 h-3 inline text-aquiz-gray-lighter" />
                  </Label>
                  <Select value={primoAccedant} onValueChange={setPrimoAccedant}>
                    <SelectTrigger className="w-[70px] h-7 text-[11px] rounded-md border-aquiz-gray-lighter bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-px h-4 bg-aquiz-gray-lighter hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] text-aquiz-gray font-medium cursor-help whitespace-nowrap" title="Salarié d'une entreprise privée de 10 salariés ou plus (éligible Action Logement)">
                    Salarié 10+ <Info className="w-3 h-3 inline text-aquiz-gray-lighter" />
                  </Label>
                  <Select value={salariePriveMin10} onValueChange={setSalariePriveMin10}>
                    <SelectTrigger className="w-[70px] h-7 text-[11px] rounded-md border-aquiz-gray-lighter bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-px h-4 bg-aquiz-gray-lighter hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] text-aquiz-gray font-medium cursor-help whitespace-nowrap" title="Agent de la fonction publique (éligible au prêt fonctionnaire)">
                    Fonctionnaire <Info className="w-3 h-3 inline text-aquiz-gray-lighter" />
                  </Label>
                  <Select value={fonctionnaire} onValueChange={setFonctionnaire}>
                    <SelectTrigger className="w-[70px] h-7 text-[11px] rounded-md border-aquiz-gray-lighter bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Badge données vérifiées */}
            <div className="px-4 sm:px-5 py-2 border-t border-aquiz-gray-lighter/50 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
                <span className="text-[10px] text-aquiz-gray leading-snug">
                  Données vérifiées · Sources : <a href="https://www.anil.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-aquiz-black">ANIL</a>, <a href="https://www.legifrance.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline hover:text-aquiz-black">Légifrance</a>, <a href="https://www.service-public.fr" target="_blank" rel="noopener noreferrer" className="underline hover:text-aquiz-black">service-public.fr</a> · Janvier 2026
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-5 py-6 md:py-8">

        {/* Filtres catégorie — pills avec counts */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-5 sm:mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all duration-150 ${
              activeCategory === 'all'
                ? 'bg-aquiz-black text-white shadow-sm'
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
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 sm:gap-2 ${
                  activeCategory === cat
                    ? 'bg-aquiz-black text-white shadow-sm'
                    : 'bg-aquiz-gray-lightest text-aquiz-gray hover:bg-aquiz-gray-lighter'
                }`}
              >
                {LABELS_CATEGORIES[cat]}
                <span className={`text-[10px] tabular-nums ${
                  activeCategory === cat ? 'text-white/60' : 'text-aquiz-gray-light'
                }`}>
                  {countParCategorie[cat]}
                </span>
              </button>
            ))
          }
        </div>

        {/* Liste des aides */}
        <div className="space-y-3 mb-10">
          {aidesToShow.map(aide => (
            <AideCard
              key={aide.id}
              aide={aide}
              expanded={expandedAides.has(aide.id)}
              onToggle={() => toggleAide(aide.id)}
            />
          ))}
          {aidesToShow.length === 0 && (
            <div className="rounded-xl border border-aquiz-gray-lighter p-12 text-center">
              <p className="text-sm text-aquiz-gray-light">Aucune aide dans cette catégorie</p>
            </div>
          )}
        </div>

        {/* Lead capture — Récapitulatif aides par email */}
        {aidesEligibles.length > 0 && (
          <div className="mb-6">
            <LeadCaptureGate
              titre="Recevez votre récapitulatif d'aides"
              description={`${aidesEligibles.length} aide${aidesEligibles.length > 1 ? 's' : ''} identifiée${aidesEligibles.length > 1 ? 's' : ''} pour votre profil — gardez une trace pour vos démarches.`}
              source="aides"
              contexte={{
                zone: zoneSelectionnee.zonePTZ,
                commune: zoneSelectionnee.nomCommune,
                departement: zoneSelectionnee.codeDepartement,
                nbAides: aidesEligibles.length,
                totalAides,
              }}
              variant="inline"
              buttonText="Recevoir mon récapitulatif"
              successText="Récapitulatif envoyé !"
            />
          </div>
        )}

        {/* CTA Contact */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 p-4 sm:p-6 rounded-2xl bg-aquiz-gray-lightest/60 border border-aquiz-gray-lighter mb-8">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-aquiz-gray-lighter flex items-center justify-center shrink-0 shadow-sm">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-aquiz-gray" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-aquiz-black">
                Besoin d&apos;accompagnement ?
              </p>
              <p className="text-xs text-aquiz-gray-light mt-0.5">
                Un conseiller vous aide à constituer vos dossiers d&apos;aides
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl shadow-none font-semibold h-9 sm:h-10 px-4 sm:px-5 text-xs w-full sm:w-auto shrink-0"
            onClick={() => setShowContactModal(true)}
          >
            Être rappelé
            <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Note */}
        <p className="text-[11px] text-aquiz-gray-light text-center mb-6 leading-relaxed">
          Liste indicative · zone {zoneSelectionnee.zonePTZ} · vérifiez l&apos;éligibilité auprès des organismes ou d&apos;un conseiller ADIL
        </p>

        {/* Nav bas */}
        <div className="flex items-center justify-between pt-5 pb-12 border-t border-aquiz-gray-lighter">
          <button
            onClick={() => fromStore ? router.push('/carte') : setLocalZone(null)}
            className="text-xs text-aquiz-gray-light hover:text-aquiz-gray flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {fromStore ? 'Retour à la carte' : 'Tous les départements'}
          </button>
          <Button asChild size="sm" variant="outline" className="rounded-xl border-aquiz-gray-lighter text-xs h-9 px-4">
            <Link href="/simulateur/mode-a">
              {fromStore ? 'Récapitulatif' : 'Simuler'}
              <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
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

export default function AidesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AidesPageContent />
    </Suspense>
  )
}
