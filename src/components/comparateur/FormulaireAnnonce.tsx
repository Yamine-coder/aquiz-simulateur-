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
    Euro,
    Home,
    Link2,
    Loader2,
    MapPin,
    Plus,
    Save,
    Sparkles,
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
  imageUrl: z.string().url().optional().or(z.literal(''))
})

type AnnonceFormData = z.infer<typeof annonceSchema>

// ============================================
// COMPOSANT
// ============================================

interface FormulaireAnnonceProps {
  editMode?: boolean
  initialValues?: Partial<NouvelleAnnonce>
  onSubmit: (data: NouvelleAnnonce) => void
  onCancel?: () => void
}

export function FormulaireAnnonce({
  editMode = false,
  initialValues,
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
  const [activeTab, setActiveTab] = useState<'url' | 'coller' | 'manuel'>('url')
  
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
      titre: data.titre || undefined,
      notes: data.notes || undefined,
      imageUrl: data.imageUrl || undefined
    } as NouvelleAnnonce)
  }
  
  return (
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 bg-aquiz-gray-lightest rounded-2xl">
          <TabsTrigger value="url" className="gap-2 py-3 rounded-xl data-[state=active]:bg-aquiz-green data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Link2 className="h-4 w-4" />
            <div className="text-left">
              <div className="font-semibold text-xs sm:text-sm">Lien</div>
              <div className="text-[9px] opacity-70 font-normal hidden sm:block">Coller l&apos;URL</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="coller" className="gap-2 py-3 rounded-xl data-[state=active]:bg-aquiz-green data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <ClipboardPaste className="h-4 w-4" />
            <div className="text-left">
              <div className="font-semibold text-xs sm:text-sm">Contenu</div>
              <div className="text-[9px] opacity-70 font-normal hidden sm:block">Coller le texte</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="manuel" className="gap-2 py-3 rounded-xl data-[state=active]:bg-aquiz-green data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Plus className="h-4 w-4" />
            <div className="text-left">
              <div className="font-semibold text-xs sm:text-sm">Manuel</div>
              <div className="text-[9px] opacity-70 font-normal hidden sm:block">Saisir les champs</div>
            </div>
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
                className="bg-aquiz-green hover:bg-aquiz-green/90 h-12 px-6 rounded-xl text-white font-medium shadow-sm"
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
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
              className="w-full bg-aquiz-green hover:bg-aquiz-green/90 h-12 rounded-xl text-white font-medium shadow-sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
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
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-0">
            
            {/* ========== SECTION 1 : INFORMATIONS ESSENTIELLES ========== */}
            <div className="border border-aquiz-gray-lighter rounded-2xl overflow-hidden">
              <div className="bg-aquiz-gray-lightest px-5 py-3.5 border-b border-aquiz-gray-lighter">
                <h4 className="font-semibold text-aquiz-black text-sm flex items-center gap-2">
                  <Home className="h-4 w-4 text-aquiz-green" />
                  Informations essentielles
                </h4>
              </div>
              <div className="p-5 space-y-4">
                {/* Type de bien */}
                <div className="space-y-2">
                  <Label className="text-xs text-aquiz-gray uppercase tracking-wide">Type de bien</Label>
                  <RadioGroup
                    value={type}
                    onValueChange={(val) => setValue('type', val as TypeBienAnnonce)}
                    className="flex gap-3"
                  >
                    <label 
                      htmlFor="type-appart"
                      className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        type === 'appartement' 
                          ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-black shadow-sm' 
                          : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light'
                      }`}
                    >
                      <RadioGroupItem value="appartement" id="type-appart" className="sr-only" />
                      <Building2 className={`h-4 w-4 ${type === 'appartement' ? 'text-aquiz-green' : 'text-aquiz-gray'}`} />
                      <span className="text-sm font-medium">Appartement</span>
                    </label>
                    <label 
                      htmlFor="type-maison"
                      className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        type === 'maison' 
                          ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-black shadow-sm' 
                          : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light'
                      }`}
                    >
                      <RadioGroupItem value="maison" id="type-maison" className="sr-only" />
                      <Home className={`h-4 w-4 ${type === 'maison' ? 'text-aquiz-green' : 'text-aquiz-gray'}`} />
                      <span className="text-sm font-medium">Maison</span>
                    </label>
                  </RadioGroup>
                </div>
                
                {/* Prix et Surface sur une ligne */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prix" className="text-xs text-aquiz-gray uppercase tracking-wide">
                      Prix
                    </Label>
                    <div className="relative">
                      <Input
                        id="prix"
                        type="number"
                        placeholder="250 000"
                        className="pr-8"
                        {...register('prix', { valueAsNumber: true })}
                      />
                      <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-aquiz-gray-light" />
                    </div>
                    {errors.prix && (
                      <p className="text-xs text-red-500">{errors.prix.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="surface" className="text-xs text-aquiz-gray uppercase tracking-wide">
                      Surface
                    </Label>
                    <div className="relative">
                      <Input
                        id="surface"
                        type="number"
                        placeholder="65"
                        className="pr-10"
                        {...register('surface', { valueAsNumber: true })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-aquiz-gray-light">m²</span>
                    </div>
                    {errors.surface && (
                      <p className="text-xs text-red-500">{errors.surface.message}</p>
                    )}
                  </div>
                </div>
                
                {/* Prix au m² calculé */}
                {prixM2 > 0 && (
                  <div className="bg-aquiz-green/5 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-aquiz-gray font-medium">Prix au m²</span>
                    <span className="font-bold text-aquiz-green text-sm">
                      {prixM2.toLocaleString('fr-FR')} €/m²
                    </span>
                  </div>
                )}
                
                {/* Pièces et Chambres */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-aquiz-gray uppercase tracking-wide">Pièces</Label>
                    <Select
                      value={String(watch('pieces'))}
                      onValueChange={(val) => setValue('pieces', parseInt(val))}
                    >
                      <SelectTrigger className="h-10">
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
                    <Label className="text-xs text-aquiz-gray uppercase tracking-wide">Chambres</Label>
                    <Select
                      value={String(watch('chambres'))}
                      onValueChange={(val) => setValue('chambres', parseInt(val))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Chambres" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 0 ? 'Studio' : `${n} ch.`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ========== SECTION 2 : LOCALISATION ========== */}
            <div className="border border-aquiz-gray-lighter rounded-2xl overflow-hidden mt-4">
              <div className="bg-aquiz-gray-lightest px-5 py-3.5 border-b border-aquiz-gray-lighter">
                <h4 className="font-semibold text-aquiz-black text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-aquiz-green" />
                  Localisation
                </h4>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="ville" className="text-xs text-aquiz-gray uppercase tracking-wide">
                      Ville
                    </Label>
                    <Input
                      id="ville"
                      placeholder="Paris"
                      {...register('ville')}
                    />
                    {errors.ville && (
                      <p className="text-xs text-red-500">{errors.ville.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="codePostal" className="text-xs text-aquiz-gray uppercase tracking-wide">
                      Code postal
                    </Label>
                    <Input
                      id="codePostal"
                      placeholder="75001"
                      maxLength={5}
                      {...register('codePostal')}
                    />
                    {errors.codePostal && (
                      <p className="text-xs text-red-500">{errors.codePostal.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* ========== SECTION 3 : ÉNERGIE & ÉQUIPEMENTS ========== */}
            <div className="border border-aquiz-gray-lighter rounded-2xl overflow-hidden mt-4">
              <div className="bg-aquiz-gray-lightest px-5 py-3.5 border-b border-aquiz-gray-lighter">
                <h4 className="font-semibold text-aquiz-black text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-aquiz-green" />
                  Énergie & Équipements
                </h4>
              </div>
              <div className="p-5 space-y-4">
                {/* DPE */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-aquiz-gray uppercase tracking-wide">DPE</Label>
                  <Select
                    value={watch('dpe')}
                    onValueChange={(val) => setValue('dpe', val as ClasseDPE)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="DPE" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> A - Excellent</span></SelectItem>
                      <SelectItem value="B"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-green-500" /> B - Très bon</span></SelectItem>
                      <SelectItem value="C"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-lime-500" /> C - Bon</span></SelectItem>
                      <SelectItem value="D"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-yellow-500" /> D - Moyen</span></SelectItem>
                      <SelectItem value="E"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-orange-500" /> E - Passable</span></SelectItem>
                      <SelectItem value="F"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-500" /> F - Mauvais</span></SelectItem>
                      <SelectItem value="G"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-700" /> G - Très mauvais</span></SelectItem>
                      <SelectItem value="NC"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-300" /> Non communiqué</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Étage (appartement uniquement) */}
                {type === 'appartement' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-aquiz-gray uppercase tracking-wide">Étage</Label>
                      <Select
                        value={watch('etage') !== undefined && watch('etage') !== null ? String(watch('etage')) : ''}
                        onValueChange={(val) => setValue('etage', val ? parseInt(val) : undefined)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">RDC</SelectItem>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}{n === 1 ? 'er' : 'e'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        watch('ascenseur') 
                          ? 'border-aquiz-green bg-aquiz-green/5 shadow-sm' 
                          : 'border-aquiz-gray-lighter'
                      }`}>
                        <input
                          type="checkbox"
                          {...register('ascenseur')}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          watch('ascenseur') 
                            ? 'bg-aquiz-green border-aquiz-green' 
                            : 'border-aquiz-gray-light'
                        }`}>
                          {watch('ascenseur') && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm">Ascenseur</span>
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Équipements */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-aquiz-gray uppercase tracking-wide">Équipements</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'balconTerrasse', label: 'Balcon' },
                      { key: 'parking', label: 'Parking' },
                      { key: 'cave', label: 'Cave' },
                    ].map((item) => (
                      <label 
                        key={item.key}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-center justify-center ${
                          watch(item.key as keyof AnnonceFormData)
                            ? 'border-aquiz-green bg-aquiz-green/5 shadow-sm' 
                            : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light'
                        }`}
                      >
                        <input
                          type="checkbox"
                          {...register(item.key as keyof AnnonceFormData)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          watch(item.key as keyof AnnonceFormData)
                            ? 'bg-aquiz-green border-aquiz-green' 
                            : 'border-aquiz-gray-light'
                        }`}>
                          {watch(item.key as keyof AnnonceFormData) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* ========== SECTION 4 : INFORMATIONS COMPLÉMENTAIRES (collapsible) ========== */}
            <details className="border border-aquiz-gray-lighter rounded-2xl overflow-hidden mt-4 group">
              <summary className="bg-aquiz-gray-lightest px-5 py-3.5 cursor-pointer list-none flex items-center justify-between">
                <h4 className="font-semibold text-aquiz-black text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4 text-aquiz-gray" />
                  Informations complémentaires
                </h4>
                <span className="text-xs text-aquiz-gray-light font-medium">Optionnel</span>
              </summary>
              <div className="p-5 space-y-4 border-t border-aquiz-gray-lighter">
                {/* URL (optionnel, visible seulement en mode création) */}
                {!editMode && (
                  <div className="space-y-1.5">
                    <Label htmlFor="url" className="text-xs text-aquiz-gray uppercase tracking-wide">
                      URL de l&apos;annonce
                    </Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://www.seloger.com/..."
                      {...register('url')}
                    />
                  </div>
                )}
                
                {/* Charges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="chargesMensuelles" className="text-xs text-aquiz-gray uppercase tracking-wide">
                      Charges /mois
                    </Label>
                    <div className="relative">
                      <Input
                        id="chargesMensuelles"
                        type="number"
                        placeholder="—"
                        className="pr-8"
                        {...register('chargesMensuelles', { valueAsNumber: true })}
                      />
                      <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-aquiz-gray-light" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="taxeFonciere" className="text-xs text-aquiz-gray uppercase tracking-wide">
                      Taxe foncière /an
                    </Label>
                    <div className="relative">
                      <Input
                        id="taxeFonciere"
                        type="number"
                        placeholder="—"
                        className="pr-8"
                        {...register('taxeFonciere', { valueAsNumber: true })}
                      />
                      <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-aquiz-gray-light" />
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs text-aquiz-gray uppercase tracking-wide">
                    Notes personnelles
                  </Label>
                  <textarea
                    id="notes"
                    rows={2}
                    placeholder="Points forts, à vérifier..."
                    className="w-full px-3 py-2.5 border border-aquiz-gray-lighter rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aquiz-green/20 focus:border-aquiz-green"
                    {...register('notes')}
                  />
                </div>
              </div>
            </details>
            
            {/* ========== BOUTONS ========== */}
            <div className="flex gap-3 pt-6">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-xl border-aquiz-gray-lighter text-aquiz-gray hover:text-aquiz-black">
                  Annuler
                </Button>
              )}
              <Button 
                type="submit" 
                className="flex-1 h-12 rounded-xl bg-aquiz-green hover:bg-aquiz-green/90 text-white font-medium shadow-sm"
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
