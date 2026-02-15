'use client'

/**
 * Page Aides Financières - Mode A
 * 
 * Parcours : Simulateur Mode A → Carte → Sélection zone → AIDES
 * 
 * Cette page reçoit les données du store :
 * - profil (revenus, situation) depuis le simulateur
 * - zoneSelectionnee (zone PTZ, commune) depuis la carte
 * 
 * Affiche directement les aides éligibles pour la zone sélectionnée
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
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Banknote,
    Check,
    CheckCircle2,
    ChevronDown,
    ExternalLink,
    FileCheck,
    Gift,
    Hammer,
    Home,
    Info,
    MapPin,
    MapPinned,
    Percent,
    Star,
    User
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

// Icônes par catégorie
const ICONES_CATEGORIES: Record<CategorieAide, React.ReactNode> = {
  pret_aide: <Banknote className="h-5 w-5" />,
  avantage_fiscal: <Percent className="h-5 w-5" />,
  subvention: <Gift className="h-5 w-5" />,
  dispositif_accession: <FileCheck className="h-5 w-5" />,
  aide_travaux: <Hammer className="h-5 w-5" />,
  aide_locale: <MapPinned className="h-5 w-5" />
}

// Couleurs par catégorie - plus sobres
const COULEURS_CATEGORIES: Record<CategorieAide, string> = {
  pret_aide: 'bg-slate-700',
  avantage_fiscal: 'bg-slate-600',
  subvention: 'bg-emerald-600',
  dispositif_accession: 'bg-slate-500',
  aide_travaux: 'bg-slate-600',
  aide_locale: 'bg-slate-500'
}

// =====================================================
// COMPOSANTS
// =====================================================

/** Indicateur du parcours Mode A - Style épuré */
function ParcoursModeA({ etapeActive }: { etapeActive: number }) {
  const etapes = [
    { num: 1, label: 'Profil', icon: User },
    { num: 2, label: 'Carte', icon: MapPin },
    { num: 3, label: 'Zone', icon: Home },
    { num: 4, label: 'Aides', icon: Gift }
  ]
  
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {etapes.map((etape, index) => {
        const Icon = etape.icon
        const isActive = etape.num === etapeActive
        const isCompleted = etape.num < etapeActive
        
        return (
          <div key={etape.num} className="flex items-center">
            <div className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${isActive 
                ? 'bg-slate-900 text-white' 
                : isCompleted
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-50 text-slate-400'
              }
            `}>
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span>{etape.label}</span>
            </div>
            
            {index < etapes.length - 1 && (
              <div className={`
                w-4 h-px mx-1
                ${index < etapeActive - 1 ? 'bg-emerald-400' : 'bg-slate-200'}
              `} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Résumé de la zone sélectionnée - Style épuré */
function ZoneResume({ zone, capaciteAchat }: { 
  zone: {
    nomCommune?: string
    codeDepartement?: string
    zonePTZ?: string
    prixM2?: number
    surfaceAccessible?: number
  }
  capaciteAchat?: number
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Zone */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Zone sélectionnée</div>
            <div className="text-lg font-semibold text-slate-900">
              {zone.nomCommune || 'Non définie'}
              {zone.codeDepartement && (
                <span className="text-slate-400 font-normal ml-1">({zone.codeDepartement})</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-slate-900 text-white rounded">
                Zone {zone.zonePTZ || 'A'}
              </span>
              {zone.prixM2 && (
                <span className="text-xs text-slate-500">
                  {zone.prixM2.toLocaleString('fr-FR')} €/m²
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Capacité */}
        {capaciteAchat && capaciteAchat > 0 && (
          <div className="text-right">
            <div className="text-xs text-slate-500">Capacité d&apos;achat</div>
            <div className="text-xl font-bold text-emerald-600">
              {capaciteAchat.toLocaleString('fr-FR')} €
            </div>
            {zone.surfaceAccessible && (
              <div className="text-xs text-slate-500">
                ≈ {zone.surfaceAccessible} m²
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Message si pas de zone sélectionnée - Style épuré */
function PasDeZone() {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 mb-3">
        Aucune zone sélectionnée
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        Complétez le simulateur et sélectionnez une zone sur la carte pour voir vos aides.
      </p>
      <div className="flex flex-col gap-3">
        <Button asChild className="bg-slate-900 hover:bg-slate-800">
          <Link href="/simulateur/mode-a">
            <User className="mr-2 h-4 w-4" />
            Commencer le simulateur
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/carte">
            <MapPin className="mr-2 h-4 w-4" />
            Aller à la carte
          </Link>
        </Button>
      </div>
    </div>
  )
}

/** Carte d'aide - Style épuré */
function AideCard({ 
  aide, 
  expanded, 
  onToggle 
}: { 
  aide: AideAccession
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div 
      className={`
        bg-white rounded-xl border overflow-hidden transition-all duration-200
        ${expanded ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'}
      `}
    >
      {/* Header cliquable */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        {/* Indicateur de catégorie */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0
          ${COULEURS_CATEGORIES[aide.categorie]}
        `}>
          {ICONES_CATEGORIES[aide.categorie]}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-slate-900 text-sm">{aide.nom}</h3>
            {aide.taux === 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">0%</span>
            )}
          </div>
          
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
            {aide.description}
          </p>
          
          {/* Montant */}
          {aide.montant && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-600">
                {aide.montant.max 
                  ? `Jusqu'à ${aide.montant.max.toLocaleString('fr-FR')} €`
                  : aide.montant.calcul
                }
              </span>
              {aide.taux !== undefined && aide.taux > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {aide.taux}%
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0
          ${expanded ? 'bg-slate-900 text-white rotate-180' : 'bg-slate-100 text-slate-400'}
        `}>
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </button>
      
      {/* Contenu expandé */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
          {/* Avantages */}
          <div>
            <h4 className="text-xs font-medium text-slate-900 mb-2 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Avantages
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {aide.avantages.map((avantage, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">{avantage}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Conditions */}
          <div>
            <h4 className="text-xs font-medium text-slate-900 mb-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-blue-500" />
              Conditions
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {aide.conditions.primoAccedant && (
                <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded">
                  Primo-accédant
                </span>
              )}
              {aide.conditions.plafondRevenus && (
                <span className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 rounded">
                  Sous plafond revenus
                </span>
              )}
              {aide.conditions.salariePriveMin10 && (
                <span className="text-[10px] px-2 py-1 bg-orange-50 text-orange-700 rounded">
                  Salarié privé (10+ sal.)
                </span>
              )}
              {aide.conditions.residencePrincipale && (
                <span className="text-[10px] px-2 py-1 bg-green-50 text-green-700 rounded">
                  Résidence principale
                </span>
              )}
              {aide.conditions.typeBien && (
                <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded">
                  {aide.conditions.typeBien.join(' / ')}
                </span>
              )}
              {aide.conditions.zoneANRU && (
                <span className="text-[10px] px-2 py-1 bg-red-50 text-red-700 rounded">
                  Zone ANRU/QPV
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {aide.organisme}
            </div>
            <a 
              href={aide.urlOfficielle} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              En savoir plus
              <ExternalLink className="h-3 w-3" />
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
  const { zoneSelectionnee, profil, parametresModeA, resultats } = useSimulateurStore()
  
  // États locaux pour ajuster le filtrage
  const [salariePriveMin10, setSalariePriveMin10] = useState('non')
  const [fonctionnaire, setFonctionnaire] = useState('non')
  const [primoAccedant, setPrimoAccedant] = useState('oui')
  
  // Aides expandées
  const [expandedAides, setExpandedAides] = useState<Set<string>>(new Set(['ptz', 'action_logement']))
  
  // Catégorie active
  const [activeCategory, setActiveCategory] = useState<CategorieAide | 'all'>('all')
  
  // Modale de contact
  const [showContactModal, setShowContactModal] = useState(false)
  
  // Déterminer le type de bien depuis les paramètres Mode A
  const typeBien = parametresModeA?.typeBien || 'neuf'
  
  // Calculer les revenus annuels
  const revenusAnnuels = (profil?.revenusMensuelsTotal || 0) * 12
  
  // Calculer la capacité d'achat (prixAchatMax ou capaciteEmprunt + apport)
  const capaciteAchat = resultats?.prixAchatMax || 
    ((resultats?.capaciteEmprunt || 0) + (parametresModeA?.apport || 0))
  
  // Déterminer si fonctionnaire depuis le profil
  const estFonctionnaire = profil?.statutProfessionnel === 'fonctionnaire'
  
  // Filtrer les aides selon le profil et la zone
  const aidesEligibles = useMemo(() => {
    if (!zoneSelectionnee) return []
    
    return filtrerAidesParProfil({
      codePostal: zoneSelectionnee.codePostal || undefined,
      primoAccedant: primoAccedant === 'oui',
      revenus: revenusAnnuels || undefined,
      typeBien: typeBien,
      salariePriveMin10: salariePriveMin10 === 'oui',
      fonctionnaire: fonctionnaire === 'oui' || estFonctionnaire,
      age: profil?.age || undefined
    })
  }, [zoneSelectionnee, primoAccedant, revenusAnnuels, typeBien, salariePriveMin10, fonctionnaire, estFonctionnaire, profil?.age])
  
  const aidesParCategorie = useMemo(() => grouperAidesParCategorie(aidesEligibles), [aidesEligibles])
  const totalAides = useMemo(() => calculerTotalAides(aidesEligibles), [aidesEligibles])
  
  const countParCategorie = useMemo(() => {
    const counts: Record<CategorieAide, number> = {
      pret_aide: 0,
      avantage_fiscal: 0,
      subvention: 0,
      dispositif_accession: 0,
      aide_travaux: 0,
      aide_locale: 0
    }
    Object.entries(aidesParCategorie).forEach(([cat, aides]) => {
      counts[cat as CategorieAide] = aides.length
    })
    return counts
  }, [aidesParCategorie])
  
  const aidesToShow = activeCategory === 'all' 
    ? aidesEligibles 
    : aidesParCategorie[activeCategory]
  
  const toggleAide = (id: string) => {
    setExpandedAides(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  // Si pas de zone sélectionnée, afficher le message
  if (!zoneSelectionnee) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4">
          <ParcoursModeA etapeActive={4} />
          <PasDeZone />
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Indicateur de parcours */}
        <ParcoursModeA etapeActive={4} />
        
        {/* Résumé de la zone */}
        <ZoneResume 
          zone={zoneSelectionnee} 
          capaciteAchat={capaciteAchat}
        />
        
        {/* Stats compactes */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{aidesEligibles.length}</div>
            <div className="text-xs text-slate-500">aides disponibles</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {totalAides.max > 0 
                ? `${(totalAides.max / 1000).toFixed(0)}k€`
                : '—'
              }
            </div>
            <div className="text-xs text-slate-500">économies max</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {Object.values(countParCategorie).filter(c => c > 0).length}
            </div>
            <div className="text-xs text-slate-500">catégories</div>
          </div>
        </div>
        
        {/* Filtres rapides - Compact */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Profil</span>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-600">Primo-accédant</Label>
              <Select value={primoAccedant} onValueChange={setPrimoAccedant}>
                <SelectTrigger className="w-20 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-600">Salarié 10+</Label>
              <Select value={salariePriveMin10} onValueChange={setSalariePriveMin10}>
                <SelectTrigger className="w-20 h-7 text-xs">
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
                <Label className="text-xs text-slate-600">Fonctionnaire</Label>
                <Select value={fonctionnaire} onValueChange={setFonctionnaire}>
                  <SelectTrigger className="w-20 h-7 text-xs">
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
        </div>
        
        {/* Filtres par catégorie - Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${activeCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            Toutes ({aidesEligibles.length})
          </button>
          {(Object.keys(LABELS_CATEGORIES) as CategorieAide[])
            .filter(cat => countParCategorie[cat] > 0)
            .map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                  ${activeCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                {LABELS_CATEGORIES[cat]}
                <span className={`
                  w-4 h-4 rounded-full text-[10px] flex items-center justify-center
                  ${activeCategory === cat ? 'bg-white/20' : 'bg-slate-100'}
                `}>
                  {countParCategorie[cat]}
                </span>
              </button>
            ))
          }
        </div>
        
        {/* Liste des aides */}
        <div className="space-y-3 mb-6">
          {aidesToShow.map((aide) => (
            <AideCard
              key={aide.id}
              aide={aide}
              expanded={expandedAides.has(aide.id)}
              onToggle={() => toggleAide(aide.id)}
            />
          ))}
        </div>
        
        {/* CTA final - sobre */}
        <div className="bg-slate-900 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-base font-semibold text-white mb-1">
                Besoin d&apos;accompagnement à {zoneSelectionnee.nomCommune} ?
              </h3>
              <p className="text-sm text-slate-400">
                Un expert local vous guide dans vos démarches d&apos;achat en zone {zoneSelectionnee.zonePTZ}
              </p>
            </div>
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setShowContactModal(true)}
            >
              Être rappelé
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Note - sobre */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Information</p>
              <p>
                Liste indicative basée sur la zone {zoneSelectionnee.zonePTZ}. 
                Vérifiez l&apos;éligibilité auprès des organismes ou d&apos;un conseiller ADIL.
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation - sobre */}
        <div className="flex justify-between pb-8">
          <button 
            onClick={() => router.push('/carte')}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Changer de zone
          </button>
          <button 
            onClick={() => router.push('/simulateur/mode-a')}
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-2"
          >
            Voir le récapitulatif
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Modale Contact */}
      <ContactModal 
        isOpen={showContactModal} 
        onClose={() => setShowContactModal(false)}
      />
    </div>
  )
}
