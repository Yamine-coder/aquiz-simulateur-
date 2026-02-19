'use client'

/**
 * Formulaire d'ajout d'annonce avec import par collage de texte
 * Coller le contenu d'une annonce → extraction automatique des données
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { compterChampsExtraits, parseTexteAnnonce } from '@/lib/scraping/parseTexteAnnonce'
import type { ClasseDPE, NouvelleAnnonce, TypeBienAnnonce } from '@/types/annonces'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    AlertCircle,
    Building2,
    Check,
    ClipboardPaste,
    Download,
    Euro,
    Home,
    Link2,
    Loader2,
    MapPin,
    Plus,
    Save,
    ScanSearch,
    Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'



// ============================================
// SCHÉMA DE VALIDATION
// ============================================

const annonceSchema = z.object({
  url: z.string().url().optional().or(z.literal('')),
  prix: z.number().min(10000, 'Prix minimum 10 000 €').max(10000000, 'Prix maximum 10 000 000 €'),
  surface: z.number().min(9, 'Surface minimum 9 m²').max(1000, 'Surface maximum 1000 m²'),
  type: z.enum(['appartement', 'maison'] as const),
  pieces: z.number().min(1, 'Minimum 1 pièce').max(20, 'Maximum 20 pièces'),
  chambres: z.number().min(0).max(15),
  ville: z.string().min(2, 'Ville requise'),
  codePostal: z.string().regex(/^\d{5}$/, 'Code postal invalide'),
  dpe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NC'] as const),
  etage: z.number().min(0).max(50).optional().nullable(),
  ascenseur: z.boolean().optional(),
  balconTerrasse: z.boolean().optional(),
  parking: z.boolean().optional(),
  cave: z.boolean().optional(),
  chargesMensuelles: z.union([z.number().min(0), z.nan()]).optional().nullable(),
  taxeFonciere: z.union([z.number().min(0), z.nan()]).optional().nullable(),
  titre: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  ges: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NC'] as const).optional(),
  description: z.string().max(1000).optional(),
  anneeConstruction: z.union([z.number().min(1800).max(2030), z.nan()]).optional().nullable(),
  nbSallesBains: z.union([z.number().min(0).max(10), z.nan()]).optional().nullable(),
  orientation: z.string().max(30).optional(),
})

type AnnonceFormData = z.infer<typeof annonceSchema>

// ============================================
// COMPOSANT
// ============================================

interface FormulaireAnnonceProps {
  editMode?: boolean
  initialValues?: Partial<NouvelleAnnonce>
  initialTab?: 'url' | 'coller' | 'manuel'
  onSubmit: (data: NouvelleAnnonce) => void
  onCancel?: () => void
}

export function FormulaireAnnonce({
  editMode = false,
  initialValues,
  initialTab = 'url',
  onSubmit,
  onCancel
}: FormulaireAnnonceProps) {
  // États
  const [pastedText, setPastedText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [extractCount, setExtractCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'url' | 'coller' | 'manuel'>(editMode ? 'manuel' : initialTab)
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<AnnonceFormData>({
    resolver: zodResolver(annonceSchema),
    defaultValues: {
      type: 'appartement',
      pieces: 3,
      chambres: 2,
      dpe: 'D',
      ascenseur: false,
      balconTerrasse: false,
      parking: false,
      cave: false,
      ...initialValues
    }
  })
  
  const type = watch('type')
  const prix = watch('prix')
  const surface = watch('surface')
  
  // Calcul prix/m² en temps réel
  const prixM2 = prix && surface ? Math.round(prix / surface) : 0
  
  // ===== REMPLIR LE FORMULAIRE DEPUIS DES DONNÉES =====
  const remplirFormulaire = (data: Record<string, unknown>) => {
    if (data.prix) setValue('prix', data.prix as number)
    if (data.surface) setValue('surface', data.surface as number)
    if (data.type) setValue('type', data.type as TypeBienAnnonce)
    if (data.pieces) setValue('pieces', data.pieces as number)
    if (data.chambres !== undefined) setValue('chambres', data.chambres as number)
    if (data.ville) setValue('ville', data.ville as string)
    if (data.codePostal) setValue('codePostal', data.codePostal as string)
    if (data.dpe) setValue('dpe', data.dpe as ClasseDPE)
    if (data.titre) setValue('titre', data.titre as string)
    if (data.etage !== undefined) setValue('etage', data.etage as number)
    if (data.chargesMensuelles) setValue('chargesMensuelles', data.chargesMensuelles as number)
    if (data.taxeFonciere) setValue('taxeFonciere', data.taxeFonciere as number)
    if (data.balconTerrasse !== undefined) setValue('balconTerrasse', data.balconTerrasse as boolean)
    if (data.parking !== undefined) setValue('parking', data.parking as boolean)
    if (data.cave !== undefined) setValue('cave', data.cave as boolean)
    if (data.ascenseur !== undefined) setValue('ascenseur', data.ascenseur as boolean)
    if (data.url) setValue('url', data.url as string)
    if (data.imageUrl) setValue('imageUrl', data.imageUrl as string)
    if (data.ges) setValue('ges', data.ges as ClasseDPE)
    if (data.description) setValue('description', data.description as string)
    if (data.anneeConstruction) setValue('anneeConstruction', data.anneeConstruction as number)
    if (data.nbSallesBains) setValue('nbSallesBains', data.nbSallesBains as number)
    if (data.orientation) setValue('orientation', data.orientation as string)
  }

  // ===== EXTRACTION DEPUIS URL (via API + Jina Reader) =====
  const handleExtractUrl = async () => {
    if (!urlInput.trim()) {
      setExtractError('Collez l\'URL de l\'annonce')
      return
    }
    
    setIsExtracting(true)
    setExtractError(null)
    setExtractSuccess(false)
    
    try {
      const response = await fetch('/api/annonces/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() })
      })
      
      const result = await response.json()
      
      if (result.success && result.data) {
        remplirFormulaire(result.data)
        setExtractCount(result.fieldsExtracted || 5)
        setExtractSuccess(true)
        setActiveTab('manuel')
      } else {
        setExtractError(result.error || 'Impossible d\'extraire les données')
      }
    } catch {
      setExtractError('Erreur de connexion. Vérifiez votre connexion internet.')
    } finally {
      setIsExtracting(false)
    }
  }

  // ===== EXTRACTION DEPUIS TEXTE COLLÉ =====
  const handleExtractFromText = () => {
    if (!pastedText.trim()) {
      setExtractError('Collez le contenu de l\'annonce')
      return
    }
    
    setExtractError(null)
    setExtractSuccess(false)
    
    const data = parseTexteAnnonce(pastedText)
    const count = compterChampsExtraits(data)
    
    if (count === 0) {
      setExtractError('Aucune donnée trouvée dans le texte. Vérifiez que vous avez bien copié le contenu de la page d\'annonce.')
      return
    }
    
    // Remplir le formulaire
    remplirFormulaire(data as Record<string, unknown>)
    
    setExtractCount(count)
    setExtractSuccess(true)
    setActiveTab('manuel')
  }
  
  // ===== SOUMISSION =====
  const onFormSubmit = (data: AnnonceFormData) => {
    // Nettoyer les valeurs NaN des champs optionnels
    const cleanNumber = (val: number | null | undefined): number | undefined => {
      if (val === null || val === undefined || Number.isNaN(val)) return undefined
      return val
    }
    
    onSubmit({
      ...data,
      url: data.url || undefined,
      etage: cleanNumber(data.etage),
      chargesMensuelles: cleanNumber(data.chargesMensuelles),
      taxeFonciere: cleanNumber(data.taxeFonciere),
      anneeConstruction: cleanNumber(data.anneeConstruction),
      nbSallesBains: cleanNumber(data.nbSallesBains),
      titre: data.titre || undefined,
      description: data.description || undefined,
      notes: data.notes || undefined,
      imageUrl: data.imageUrl || undefined,
      ges: data.ges || undefined,
      orientation: data.orientation || undefined,
    } as NouvelleAnnonce)
  }
  
  return (
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-aquiz-gray-lightest/60 rounded-xl border border-aquiz-gray-lighter">
          <TabsTrigger value="url" className="gap-1.5 py-2.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:text-aquiz-black data-[state=active]:shadow-sm data-[state=active]:border-aquiz-gray-lighter transition-all">
            <Link2 className="h-3.5 w-3.5" />
            <span className="font-medium">Lien</span>
          </TabsTrigger>
          <TabsTrigger value="coller" className="gap-1.5 py-2.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:text-aquiz-black data-[state=active]:shadow-sm data-[state=active]:border-aquiz-gray-lighter transition-all">
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span className="font-medium">Contenu</span>
          </TabsTrigger>
          <TabsTrigger value="manuel" className="gap-1.5 py-2.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:text-aquiz-black data-[state=active]:shadow-sm data-[state=active]:border-aquiz-gray-lighter transition-all">
            <Plus className="h-3.5 w-3.5" />
            <span className="font-medium">Manuel</span>
          </TabsTrigger>
        </TabsList>
        
        {/* ===== TAB IMPORT URL ===== */}
        <TabsContent value="url" className="space-y-4 mt-5">
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <Input
                type="url"
                placeholder="Collez ici le lien de l'annonce..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setExtractError(null)
                  setExtractSuccess(false)
                }}
                className="flex-1 h-12 text-sm rounded-xl border-aquiz-gray-lighter focus:border-aquiz-green focus:ring-aquiz-green/20"
              />
              <Button
                type="button"
                onClick={handleExtractUrl}
                disabled={isExtracting || !urlInput.trim()}
                className="bg-aquiz-green hover:bg-aquiz-green/85 active:scale-[0.97] h-11 px-6 rounded-lg text-white text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-35 disabled:pointer-events-none"
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Importer
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-aquiz-gray">
              Compatible : SeLoger, LeBonCoin, PAP, Bien&apos;ici, Logic-Immo et autres sites d&apos;annonces.
            </p>
          </div>
          
          {/* Messages erreur/succès communs */}
          {extractError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800">{extractError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('coller')}
                    className="text-xs text-red-600 underline underline-offset-2 mt-1.5 hover:text-red-700"
                  >
                    Essayer en collant le contenu de la page
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {extractSuccess && (
            <div className="bg-aquiz-green/10 border border-aquiz-green/20 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-aquiz-green flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <p className="text-sm text-aquiz-black font-medium">
                  {extractCount} donnée{extractCount > 1 ? 's' : ''} extraite{extractCount > 1 ? 's' : ''} ! Vérifiez ci-dessous.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* ===== TAB COLLER LE CONTENU ===== */}
        <TabsContent value="coller" className="space-y-4 mt-5">
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-aquiz-gray-lightest border border-aquiz-gray-lighter rounded-xl p-4">
              <p className="text-sm text-aquiz-black font-semibold mb-2">Comment faire ?</p>
              <ol className="text-xs text-aquiz-gray space-y-1.5 list-decimal list-inside">
                <li>Ouvrez l&apos;annonce sur SeLoger, LeBonCoin, PAP, etc.</li>
                <li>S&eacute;lectionnez tout le texte (<kbd className="px-1.5 py-0.5 bg-white rounded-md border border-aquiz-gray-lighter text-[10px] font-mono">Ctrl+A</kbd>) puis copiez (<kbd className="px-1.5 py-0.5 bg-white rounded-md border border-aquiz-gray-lighter text-[10px] font-mono">Ctrl+C</kbd>)</li>
                <li>Collez ici (<kbd className="px-1.5 py-0.5 bg-white rounded-md border border-aquiz-gray-lighter text-[10px] font-mono">Ctrl+V</kbd>) et cliquez sur Extraire</li>
              </ol>
            </div>
            
            {/* Zone de texte */}
            <Textarea
              placeholder="Collez ici le contenu de la page d'annonce..."
              value={pastedText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setPastedText(e.target.value)
                setExtractError(null)
                setExtractSuccess(false)
              }}
              className="min-h-30 text-sm rounded-xl border-aquiz-gray-lighter focus:border-aquiz-green focus:ring-aquiz-green/20"
            />
            
            <Button
              type="button"
              onClick={handleExtractFromText}
              disabled={!pastedText.trim()}
              className="w-full bg-aquiz-green hover:bg-aquiz-green/85 active:scale-[0.98] h-11 rounded-lg text-white text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-35 disabled:pointer-events-none"
            >
              <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
              Extraire les données
            </Button>
          </div>
          
          {/* Message d'erreur */}
          {extractError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800">{extractError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manuel')}
                    className="text-xs text-red-600 underline underline-offset-2 mt-1.5 hover:text-red-700"
                  >
                    Passer en saisie manuelle
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Message de succès */}
          {extractSuccess && (
            <div className="bg-aquiz-green/10 border border-aquiz-green/20 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-aquiz-green flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <p className="text-sm text-aquiz-black font-medium">
                  {extractCount} donnée{extractCount > 1 ? 's' : ''} extraite{extractCount > 1 ? 's' : ''} ! Vérifiez et complétez ci-dessous.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* ===== TAB SAISIE MANUELLE ===== */}
        <TabsContent value="manuel" className="mt-5">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
            
            {/* ═══════════ SECTION 1 : Informations essentielles ═══════════ */}
            <div className="rounded-xl border border-aquiz-gray-lighter overflow-hidden">
              <div className="bg-aquiz-gray-lightest/50 px-5 py-3 border-b border-aquiz-gray-lighter flex items-center gap-2.5">
                <Home className="h-4 w-4 text-aquiz-green" />
                <span className="text-sm font-semibold text-aquiz-black">Informations essentielles</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Type de bien — full width cards */}
                <div className="space-y-2">
                  <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">Type de bien</Label>
                  <RadioGroup
                    value={type}
                    onValueChange={(val) => setValue('type', val as TypeBienAnnonce)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <label 
                      htmlFor="type-appart"
                      className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                        type === 'appartement' 
                          ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-black font-semibold' 
                          : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light text-aquiz-gray'
                      }`}
                    >
                      <RadioGroupItem value="appartement" id="type-appart" className="sr-only" />
                      <Building2 className={`h-4 w-4 ${type === 'appartement' ? 'text-aquiz-green' : 'text-aquiz-gray'}`} />
                      Appartement
                    </label>
                    <label 
                      htmlFor="type-maison"
                      className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                        type === 'maison' 
                          ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-black font-semibold' 
                          : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light text-aquiz-gray'
                      }`}
                    >
                      <RadioGroupItem value="maison" id="type-maison" className="sr-only" />
                      <Home className={`h-4 w-4 ${type === 'maison' ? 'text-aquiz-green' : 'text-aquiz-gray'}`} />
                      Maison
                    </label>
                  </RadioGroup>
                </div>
                
                {/* Prix + Surface — 2 colonnes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prix" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Prix
                    </Label>
                    <div className="relative">
                      <Input
                        id="prix"
                        type="number"
                        placeholder="250 000"
                        className={`pr-8 h-10 text-sm rounded-lg ${errors.prix ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`}
                        {...register('prix', { valueAsNumber: true })}
                      />
                      <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-aquiz-gray-light" />
                    </div>
                    {errors.prix && <p className="text-[10px] text-red-500">{errors.prix.message}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="surface" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Surface
                    </Label>
                    <div className="relative">
                      <Input
                        id="surface"
                        type="number"
                        step="any"
                        placeholder="65,7"
                        className={`pr-8 h-10 text-sm rounded-lg ${errors.surface ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`}
                        {...register('surface', { valueAsNumber: true })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-aquiz-gray-light">m²</span>
                    </div>
                    {errors.surface && <p className="text-[10px] text-red-500">{errors.surface.message}</p>}
                  </div>
                </div>
                
                {/* Prix au m² */}
                {prixM2 > 0 && (
                  <p className="text-xs text-aquiz-green font-medium">
                    → {prixM2.toLocaleString('fr-FR')} €/m²
                  </p>
                )}
                
                {/* Pièces + Chambres — 2 colonnes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">Pièces</Label>
                    <Select
                      value={String(watch('pieces'))}
                      onValueChange={(val) => setValue('pieces', parseInt(val))}
                    >
                      <SelectTrigger className="h-10 text-sm rounded-lg">
                        <SelectValue placeholder="Pièces" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} pièce{n > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">Chambres</Label>
                    <Select
                      value={String(watch('chambres'))}
                      onValueChange={(val) => setValue('chambres', parseInt(val))}
                    >
                      <SelectTrigger className="h-10 text-sm rounded-lg">
                        <SelectValue placeholder="Chambres" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 0 ? 'Studio' : `${n} chambre${n > 1 ? 's' : ''}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ═══════════ SECTION 2 : Localisation ═══════════ */}
            <div className="rounded-xl border border-aquiz-gray-lighter overflow-hidden">
              <div className="bg-aquiz-gray-lightest/50 px-5 py-3 border-b border-aquiz-gray-lighter flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-aquiz-green" />
                <span className="text-sm font-semibold text-aquiz-black">Localisation</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ville" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Ville
                    </Label>
                    <Input
                      id="ville"
                      placeholder="Paris"
                      className={`h-10 text-sm rounded-lg ${errors.ville ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`}
                      {...register('ville')}
                    />
                    {errors.ville && <p className="text-[10px] text-red-500">{errors.ville.message}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="codePostal" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Code postal
                    </Label>
                    <Input
                      id="codePostal"
                      placeholder="75001"
                      maxLength={5}
                      className={`h-10 text-sm rounded-lg ${errors.codePostal ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`}
                      {...register('codePostal')}
                    />
                    {errors.codePostal && <p className="text-[10px] text-red-500">{errors.codePostal.message}</p>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* ═══════════ SECTION 3 : Énergie & Équipements ═══════════ */}
            <div className="rounded-xl border border-aquiz-gray-lighter overflow-hidden">
              <div className="bg-aquiz-gray-lightest/50 px-5 py-3 border-b border-aquiz-gray-lighter flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-aquiz-green" />
                <span className="text-sm font-semibold text-aquiz-black">Énergie & Équipements</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* DPE */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">DPE</Label>
                    <Select
                      value={watch('dpe')}
                      onValueChange={(val) => setValue('dpe', val as ClasseDPE)}
                    >
                      <SelectTrigger className="h-10 text-sm rounded-lg">
                        <SelectValue placeholder="DPE" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> A</span></SelectItem>
                        <SelectItem value="B"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> B</span></SelectItem>
                        <SelectItem value="C"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-lime-500" /> C</span></SelectItem>
                        <SelectItem value="D"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" /> D</span></SelectItem>
                        <SelectItem value="E"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500" /> E</span></SelectItem>
                        <SelectItem value="F"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> F</span></SelectItem>
                        <SelectItem value="G"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-red-700" /> G</span></SelectItem>
                        <SelectItem value="NC"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> NC</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* GES */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">GES</Label>
                    <Select
                      value={watch('ges') || ''}
                      onValueChange={(val) => setValue('ges', val as ClasseDPE)}
                    >
                      <SelectTrigger className="h-10 text-sm rounded-lg">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-violet-300" /> A</span></SelectItem>
                        <SelectItem value="B"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-violet-400" /> B</span></SelectItem>
                        <SelectItem value="C"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500" /> C</span></SelectItem>
                        <SelectItem value="D"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-violet-600" /> D</span></SelectItem>
                        <SelectItem value="E"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-violet-700" /> E</span></SelectItem>
                        <SelectItem value="F"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-violet-800" /> F</span></SelectItem>
                        <SelectItem value="G"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-violet-900" /> G</span></SelectItem>
                        <SelectItem value="NC"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> NC</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Étage (si appartement) */}
                  {type === 'appartement' && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">Étage</Label>
                      <Select
                        value={watch('etage') !== undefined && watch('etage') !== null ? String(watch('etage')) : ''}
                        onValueChange={(val) => setValue('etage', val ? parseInt(val) : undefined)}
                      >
                        <SelectTrigger className="h-10 text-sm rounded-lg">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">RDC</SelectItem>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}{n === 1 ? 'er' : 'e'} étage
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Équipements — toggles */}
                <div>
                  <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium mb-2 block">Équipements</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'ascenseur', label: 'Ascenseur', show: type === 'appartement' },
                      { key: 'balconTerrasse', label: 'Balcon / Terrasse' },
                      { key: 'parking', label: 'Parking' },
                      { key: 'cave', label: 'Cave' },
                    ].filter(item => item.show !== false).map((item) => (
                      <label 
                        key={item.key}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          watch(item.key as keyof AnnonceFormData)
                            ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-green font-medium' 
                            : 'border-aquiz-gray-lighter text-aquiz-gray hover:border-aquiz-gray-light'
                        }`}
                      >
                        <input
                          type="checkbox"
                          {...register(item.key as keyof AnnonceFormData)}
                          className="sr-only"
                        />
                        {watch(item.key as keyof AnnonceFormData) && <Check className="w-3.5 h-3.5" />}
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* ═══════════ SECTION 4 : Complémentaire (collapsible) ═══════════ */}
            <details className="rounded-xl border border-aquiz-gray-lighter overflow-hidden group">
              <summary className="cursor-pointer list-none bg-aquiz-gray-lightest/50 px-5 py-3 flex items-center gap-2.5 hover:bg-aquiz-gray-lightest transition-colors">
                <Plus className="h-4 w-4 text-aquiz-green" />
                <span className="text-sm font-semibold text-aquiz-black">Infos complémentaires</span>
                <span className="text-xs text-aquiz-gray-light ml-1">· optionnel</span>
              </summary>
              <div className="p-5 space-y-4 border-t border-aquiz-gray-lighter">
                {/* URL (optionnel) */}
                {!editMode && (
                  <div className="space-y-1.5">
                    <Label htmlFor="url" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      URL de l&apos;annonce
                    </Label>
                    <Input id="url" type="url" placeholder="https://www.seloger.com/..." className="h-10 text-sm rounded-lg" {...register('url')} />
                  </div>
                )}
                
                {/* Charges */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="chargesMensuelles" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Charges /mois
                    </Label>
                    <div className="relative">
                      <Input id="chargesMensuelles" type="number" step="any" placeholder="—" className="pr-8 h-10 text-sm rounded-lg" {...register('chargesMensuelles', { valueAsNumber: true })} />
                      <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-aquiz-gray-light" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="taxeFonciere" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Taxe foncière /an
                    </Label>
                    <div className="relative">
                      <Input id="taxeFonciere" type="number" step="any" placeholder="—" className="pr-8 h-10 text-sm rounded-lg" {...register('taxeFonciere', { valueAsNumber: true })} />
                      <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-aquiz-gray-light" />
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                    Notes
                  </Label>
                  <textarea
                    id="notes"
                    rows={2}
                    placeholder="Points forts, à vérifier..."
                    className="w-full px-3 py-2.5 border border-aquiz-gray-lighter rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aquiz-green/20 focus:border-aquiz-green"
                    {...register('notes')}
                  />
                </div>
                
                {/* Année construction, SDB, Orientation */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="anneeConstruction" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Année construction
                    </Label>
                    <Input id="anneeConstruction" type="number" placeholder="ex: 1985" className="h-10 text-sm rounded-lg" {...register('anneeConstruction', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nbSallesBains" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Salles de bains
                    </Label>
                    <Input id="nbSallesBains" type="number" min={0} max={10} placeholder="—" className="h-10 text-sm rounded-lg" {...register('nbSallesBains', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="orientation" className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium">
                      Orientation
                    </Label>
                    <Input id="orientation" type="text" placeholder="Sud" className="h-10 text-sm rounded-lg" {...register('orientation')} />
                  </div>
                </div>
              </div>
            </details>
            
            {/* ═══════════ BOUTON ═══════════ */}
            <div className="flex gap-3 pt-4 mt-2 border-t border-aquiz-gray-lighter">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-xl border-aquiz-gray-lighter text-aquiz-gray hover:text-aquiz-black text-sm">
                  Annuler
                </Button>
              )}
              <Button 
                type="submit" 
                className="flex-1 h-11 rounded-xl bg-aquiz-green hover:bg-aquiz-green/90 text-white font-semibold text-sm shadow-sm"
                disabled={isSubmitting}
              >
                {editMode ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter l&apos;annonce
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
