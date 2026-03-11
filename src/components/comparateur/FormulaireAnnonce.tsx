'use client'

/**
 * Formulaire d'ajout d'annonce avec import par collage de texte
 * Coller le contenu d'une annonce → extraction automatique des données
 */

import SearchAdresse from '@/components/carte/SearchAdresse'
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
import { compterChampsExtraits, extraireImagesFromHTML, parseTexteAnnonce } from '@/lib/scraping/parseTexteAnnonce'
import type { ClasseDPE, NouvelleAnnonce, TypeBienAnnonce } from '@/types/annonces'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    AlertCircle,
    Building2,
    Check,
    ClipboardPaste,
    Download,
    Euro,
    ExternalLink,
    Home,
    Link2,
    Loader2,
    MapPin,
    Plus,
    Save,
    ScanSearch,
    Zap,
} from 'lucide-react'
import { useRef, useState } from 'react'
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
  /** Ref guard to prevent concurrent extract calls (React state is async) */
  const extractingRef = useRef(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [extractCount, setExtractCount] = useState(0)
  /** Mode assistant : activé quand le scraping échoue, guide l'utilisateur étape par étape */
  const [assistantMode, setAssistantMode] = useState(false)
  /** URL sauvegardée pour l'assistant (celle qui a échoué en scraping) */
  const [assistantUrl, setAssistantUrl] = useState('')
  /** HTML du clipboard — conservé pour extraire l'image og:image / <img> */
  const clipboardHtmlRef = useRef<string>('')
  /** Images supplémentaires extraites (carousel) */
  const extractedImagesRef = useRef<string[]>([])
  const extractedCoordsRef = useRef<{ latitude?: number; longitude?: number }>({})
  /** Champs extraits non affichés dans le formulaire mais transmis à l'annonce */
  const extractedEtagesTotalRef = useRef<number | undefined>(undefined)
  const extractedAdresseRef = useRef<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'url' | 'coller' | 'manuel'>(editMode ? 'manuel' : initialTab)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
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
    // Helpers de coercion — les données extraites peuvent avoir des types incohérents
    const toNumber = (v: unknown): number | undefined => {
      if (v === null || v === undefined) return undefined
      const n = Number(v)
      return Number.isNaN(n) ? undefined : n
    }
    const toStr = (v: unknown): string | undefined =>
      v !== null && v !== undefined ? String(v) : undefined

    if (data.prix) setValue('prix', toNumber(data.prix) as number)
    if (data.surface) setValue('surface', toNumber(data.surface) as number)
    if (data.type) setValue('type', data.type as TypeBienAnnonce)
    if (data.pieces) setValue('pieces', toNumber(data.pieces) as number)
    if (data.chambres !== undefined) setValue('chambres', toNumber(data.chambres) as number)
    if (data.ville) setValue('ville', toStr(data.ville) as string)
    if (data.codePostal) setValue('codePostal', toStr(data.codePostal) as string)
    if (data.dpe) setValue('dpe', data.dpe as ClasseDPE)
    if (data.titre) setValue('titre', toStr(data.titre) as string)
    if (data.etage !== undefined) setValue('etage', toNumber(data.etage) as number)
    if (data.chargesMensuelles) setValue('chargesMensuelles', toNumber(data.chargesMensuelles) as number)
    if (data.taxeFonciere) setValue('taxeFonciere', toNumber(data.taxeFonciere) as number)
    if (data.balconTerrasse !== undefined) setValue('balconTerrasse', !!data.balconTerrasse)
    if (data.parking !== undefined) setValue('parking', !!data.parking)
    if (data.cave !== undefined) setValue('cave', !!data.cave)
    if (data.ascenseur !== undefined) setValue('ascenseur', !!data.ascenseur)
    if (data.url) setValue('url', toStr(data.url) as string)
    if (data.imageUrl) setValue('imageUrl', toStr(data.imageUrl) as string)
    // Stocker les images supplémentaires pour la soumission
    if (Array.isArray(data.images) && data.images.length > 0) {
      extractedImagesRef.current = data.images as string[]
    }
    if (data.ges) setValue('ges', data.ges as ClasseDPE)
    if (data.description) setValue('description', toStr(data.description) as string)
    if (data.anneeConstruction) setValue('anneeConstruction', toNumber(data.anneeConstruction) as number)
    if (data.nbSallesBains) setValue('nbSallesBains', toNumber(data.nbSallesBains) as number)
    if (data.orientation) setValue('orientation', toStr(data.orientation) as string)
    // Champs non affichés dans le formulaire, stockés pour l'annonce
    const lat = toNumber(data.latitude)
    const lng = toNumber(data.longitude)
    if (lat && lng) {
      extractedCoordsRef.current = { latitude: lat, longitude: lng }
    }
    if (data.etagesTotal !== undefined) extractedEtagesTotalRef.current = toNumber(data.etagesTotal)
    if (data.adresse) extractedAdresseRef.current = toStr(data.adresse)
  }

  // ===== EXTRACTION DEPUIS URL (via API + Jina Reader) =====
  const handleExtractUrl = async () => {
    if (extractingRef.current) return
    if (!urlInput.trim()) {
      setExtractError('Collez l\'URL de l\'annonce')
      return
    }
    
    extractingRef.current = true
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
        setAssistantMode(false)
        setActiveTab('manuel')
      } else {
        // ── Auto-fallback : activer le mode assistant intelligent ──
        // Au lieu d'un message d'erreur, on guide l'utilisateur
        if (result.autoFallback || result.protectedSite) {
          setAssistantUrl(urlInput.trim())
          setAssistantMode(true)
          setActiveTab('coller')
          // Ouvrir l'annonce dans un nouvel onglet pour que l'utilisateur puisse copier
          window.open(urlInput.trim(), '_blank', 'noopener,noreferrer')
          setExtractError(null)
        } else {
          const errorMsg = result.error || 'Impossible d\'extraire les données'
          setExtractError(errorMsg)
          setAssistantUrl(urlInput.trim())
          setAssistantMode(true)
          setActiveTab('coller')
        }
      }
    } catch {
      setExtractError('Erreur de connexion. Vérifiez votre connexion internet.')
    } finally {
      setIsExtracting(false)
      extractingRef.current = false
    }
  }

  // ===== EXTRACTION DEPUIS TEXTE COLLÉ =====
  const handleExtractFromText = async () => {
    if (extractingRef.current) return
    if (!pastedText.trim()) {
      setExtractError('Collez le contenu de l\'annonce')
      return
    }
    
    extractingRef.current = true
    setIsExtracting(true)
    setExtractError(null)
    setExtractSuccess(false)
    
    try {
    const data = parseTexteAnnonce(pastedText)
    
    // Enrichir avec les images extraites du HTML clipboard (og:image, <img>)
    // Ce sont souvent des thumbnails basse-résolution — on les garde en fallback
    let clipboardImageUrl: string | undefined
    let clipboardImages: string[] = []
    if (clipboardHtmlRef.current) {
      const extracted = extraireImagesFromHTML(clipboardHtmlRef.current)
      clipboardImageUrl = extracted.imageUrl
      clipboardImages = extracted.images
    }
    
    // Privilégier les images depuis l'API (haute résolution) quand on a une URL
    const targetUrl = assistantUrl || data.url
    if (targetUrl) {
      try {
        const res = await fetch('/api/annonces/og-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        })
        const ogData = await res.json()
        if (ogData.imageUrl) {
          data.imageUrl = ogData.imageUrl
          if (ogData.images?.length) data.images = ogData.images
        }
      } catch { /* silencieux — on utilisera le clipboard en fallback */ }
    }
    
    // Fallback clipboard si l'API n'a rien renvoyé
    if (!data.imageUrl && clipboardImageUrl) {
      data.imageUrl = clipboardImageUrl
      if (clipboardImages.length > 0) data.images = clipboardImages
    }
    
    const count = compterChampsExtraits(data)
    
    if (count === 0) {
      setExtractError('Aucune donnée trouvée dans le texte. Vérifiez que vous avez bien copié le contenu de la page d\'annonce.')
      return
    }
    
    // Remplir le formulaire
    remplirFormulaire(data as Record<string, unknown>)
    
    setExtractCount(count)
    setExtractSuccess(true)
    setAssistantMode(false)
    setActiveTab('manuel')
    } finally {
      setIsExtracting(false)
      extractingRef.current = false
    }
  }
  
  // ===== SOUMISSION =====
  const onFormSubmit = (data: AnnonceFormData) => {
    setValidationErrors([])
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
      images: extractedImagesRef.current.length > 0 ? extractedImagesRef.current : undefined,
      ges: data.ges || undefined,
      orientation: data.orientation || undefined,
      latitude: extractedCoordsRef.current.latitude,
      longitude: extractedCoordsRef.current.longitude,
      etagesTotal: extractedEtagesTotalRef.current,
      adresse: extractedAdresseRef.current,
    } as NouvelleAnnonce)
  }
  
  // Labels lisibles pour les champs du formulaire
  const FIELD_LABELS: Record<string, string> = {
    prix: 'Prix',
    surface: 'Surface',
    type: 'Type de bien',
    pieces: 'Pièces',
    chambres: 'Chambres',
    ville: 'Ville',
    codePostal: 'Code postal',
    dpe: 'DPE',
    etage: 'Étage',
    chargesMensuelles: 'Charges',
    taxeFonciere: 'Taxe foncière',
    url: 'URL',
    imageUrl: 'Image',
    description: 'Description',
    anneeConstruction: 'Année construction',
    nbSallesBains: 'Salles de bains',
    orientation: 'Orientation',
    ges: 'GES',
  }

  const onFormError = (fieldErrors: Record<string, unknown>) => {
    const msgs: string[] = []
    for (const [key, err] of Object.entries(fieldErrors)) {
      const label = FIELD_LABELS[key] || key
      const msg = (err as { message?: string })?.message
      msgs.push(msg ? `${label} : ${msg}` : `${label} est invalide`)
    }
    setValidationErrors(msgs)
    // Scroll vers le premier champ en erreur
    const firstKey = Object.keys(fieldErrors)[0]
    if (firstKey) {
      const el = document.getElementById(firstKey) || document.querySelector(`[name="${firstKey}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        {!editMode && (
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
        )}
        
        {/* ===== TAB IMPORT URL ===== */}
        {!editMode && <TabsContent value="url" className="space-y-3 mt-3">
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
          {extractError && !assistantMode && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800">{extractError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssistantMode(true)
                      setAssistantUrl(urlInput.trim())
                      setActiveTab('coller')
                      if (urlInput.trim()) {
                        window.open(urlInput.trim(), '_blank', 'noopener,noreferrer')
                      }
                    }}
                    className="text-xs text-red-600 underline underline-offset-2 mt-1.5 hover:text-red-700 font-medium"
                  >
                    Récupérer en 10 secondes →
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
        </TabsContent>}
        
        {/* ===== TAB COLLER LE CONTENU ===== */}
        {!editMode && <TabsContent value="coller" className="space-y-3 mt-3">
          <div className="space-y-3">
            
            {/* ── Mode Assistant : guidage compact quand le scraping a échoué ── */}
            {assistantMode && (
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg px-3.5 py-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-xs font-semibold">Récupération rapide</p>
                </div>
                <ol className="text-xs text-amber-900/80 space-y-1.5 pl-0.5">
                  <li className="flex gap-2 items-baseline">
                    <span className="text-[10px] font-bold text-amber-500">1.</span>
                    <span>
                      Ouvrez l&apos;annonce{' '}
                      {assistantUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(assistantUrl, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center gap-0.5 text-amber-600 hover:text-amber-800 underline underline-offset-2 font-medium"
                        >
                          dans un nouvel onglet <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-2 items-baseline">
                    <span className="text-[10px] font-bold text-amber-500">2.</span>
                    <span>
                      <kbd className="px-1 py-px bg-white rounded border border-amber-200/80 text-[10px] font-mono">Ctrl+A</kbd>{' '}
                      puis{' '}
                      <kbd className="px-1 py-px bg-white rounded border border-amber-200/80 text-[10px] font-mono">Ctrl+C</kbd>
                    </span>
                  </li>
                  <li className="flex gap-2 items-baseline">
                    <span className="text-[10px] font-bold text-amber-500">3.</span>
                    <span>
                      Collez ci-dessous{' '}
                      <kbd className="px-1 py-px bg-white rounded border border-amber-200/80 text-[10px] font-mono">Ctrl+V</kbd>
                    </span>
                  </li>
                </ol>
              </div>
            )}
            
            {/* Instruction compacte (mode normal) */}
            {!assistantMode && (
              <p className="text-xs text-aquiz-gray leading-relaxed">
                Copiez tout le texte de l&apos;annonce (<kbd className="px-1 py-0.5 bg-aquiz-gray-lightest rounded border border-aquiz-gray-lighter text-[10px] font-mono">Ctrl+A</kbd> puis <kbd className="px-1 py-0.5 bg-aquiz-gray-lightest rounded border border-aquiz-gray-lighter text-[10px] font-mono">Ctrl+C</kbd>) et collez-le ci-dessous.
              </p>
            )}
            
            {/* Zone de texte */}
            <Textarea
              placeholder={assistantMode
                ? "Collez ici le contenu copié (Ctrl+V)..."
                : "Collez ici le contenu de la page d'annonce..."
              }
              value={pastedText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setPastedText(e.target.value)
                setExtractError(null)
                setExtractSuccess(false)
                // BUG-3 : invalider le HTML clipboard si l'utilisateur tape manuellement
                // (évite d'extraire les images d'un ancien copier-coller)
                clipboardHtmlRef.current = ''
              }}
              // Auto-extract dès qu'on colle du texte en mode assistant
              onPaste={(e) => {
                // Capturer le HTML du clipboard pour extraire les images
                const pastedHtml = e.clipboardData?.getData('text/html') || ''
                if (pastedHtml) clipboardHtmlRef.current = pastedHtml
                
                if (assistantMode) {
                  const pasted = e.clipboardData?.getData('text') || ''
                  if (pasted.length > 50) {
                    // Mettre à jour le state et extraire avec un léger délai
                    setPastedText(pasted)
                    setTimeout(async () => {
                      const data = parseTexteAnnonce(pasted)
                      
                      // Images clipboard = thumbnails basse-résolution (fallback)
                      let clipboardImageUrl: string | undefined
                      let clipboardImages: string[] = []
                      if (pastedHtml) {
                        const extracted = extraireImagesFromHTML(pastedHtml)
                        clipboardImageUrl = extracted.imageUrl
                        clipboardImages = extracted.images
                      }
                      
                      // Privilégier les images depuis l'API (haute résolution)
                      const targetUrl = assistantUrl || (data as Record<string, unknown>).url as string | undefined
                      if (targetUrl) {
                        try {
                          const res = await fetch('/api/annonces/og-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: targetUrl }),
                          })
                          const ogData = await res.json()
                          if (ogData.imageUrl) {
                            data.imageUrl = ogData.imageUrl
                            if (ogData.images?.length) data.images = ogData.images
                          }
                        } catch { /* silencieux */ }
                      }
                      
                      // Fallback clipboard si l'API n'a rien renvoyé
                      if (!data.imageUrl && clipboardImageUrl) {
                        data.imageUrl = clipboardImageUrl
                        if (clipboardImages.length > 0) data.images = clipboardImages
                      }
                      
                      const count = compterChampsExtraits(data)
                      if (count > 0) {
                        remplirFormulaire(data as Record<string, unknown>)
                        setExtractCount(count)
                        setExtractSuccess(true)
                        setAssistantMode(false)
                        setActiveTab('manuel')
                      } else {
                        setExtractError('Aucune donnée reconnue dans le texte collé. Essayez de copier uniquement la description de l\'annonce.')
                      }
                    }, 50)
                  }
                } else {
                  // Mode normal : juste sauvegarder le HTML pour usage ultérieur
                  const pasted = e.clipboardData?.getData('text') || ''
                  if (pasted) setPastedText(pasted)
                }
              }}
              autoFocus={assistantMode}
              className={`min-h-24 text-sm rounded-xl border-aquiz-gray-lighter focus:border-aquiz-green focus:ring-aquiz-green/20 ${assistantMode ? 'border-amber-200 focus:border-amber-400 focus:ring-amber-200/30' : ''}`}
            />
            
            <Button
              type="button"
              onClick={handleExtractFromText}
              disabled={isExtracting || !pastedText.trim()}
              className="w-full bg-aquiz-green hover:bg-aquiz-green/85 active:scale-[0.98] h-11 rounded-lg text-white text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-35 disabled:pointer-events-none"
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
                  Extraire les données
                </>
              )}
            </Button>
          </div>
          
          {/* Message d'erreur */}
          {extractError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  {extractError.split('\n').map((line, i) => (
                    <p key={i} className={i === 0 ? 'text-sm text-red-800' : 'text-xs text-red-600 mt-1'}>{line}</p>
                  ))}
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
        </TabsContent>}
        
        {/* ===== TAB SAISIE MANUELLE ===== */}        <TabsContent value="manuel" className={editMode ? 'flex-none' : 'mt-3'}>
          <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="space-y-5">
            
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
                {/* Recherche d'adresse avec autocomplétion */}
                <div className="mb-4">
                  <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium mb-1.5 block">
                    Rechercher une adresse
                  </Label>
                  <SearchAdresse
                    onSelect={({ lat, lng, label }) => {
                      // Extraire ville et code postal du label
                      const parts = label.split(',').map(s => s.trim())
                      const lastPart = parts[parts.length - 1] || ''
                      const cpMatch = lastPart.match(/(\d{5})/)
                      if (cpMatch) {
                        setValue('codePostal', cpMatch[1])
                        // Ville = ce qui est après le code postal ou avant
                        const villeMatch = lastPart.replace(cpMatch[0], '').trim()
                        if (villeMatch) setValue('ville', villeMatch)
                      }
                      // Ville depuis l'avant-dernière partie si nécessaire
                      if (!watch('ville') && parts.length >= 2) {
                        setValue('ville', parts[parts.length - 2] || parts[0])
                      }
                      // Stocker les coordonnées
                      extractedCoordsRef.current = { latitude: lat, longitude: lng }
                      // Stocker l'adresse complète
                      if (parts.length > 1) {
                        extractedAdresseRef.current = parts.slice(0, -1).join(', ')
                      } else {
                        extractedAdresseRef.current = label
                      }
                    }}
                    placeholder="Taper une adresse, ville ou code postal…"
                    className="w-full"
                  />
                  <p className="text-[10px] text-aquiz-gray mt-1">Remplit automatiquement ville, code postal et coordonnées GPS</p>
                </div>

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
                
                {/* Équipements — toggles (boutons contrôlés, pas de checkbox sr-only pour éviter le scroll fantôme) */}
                <div>
                  <Label className="text-[11px] text-aquiz-gray uppercase tracking-wide font-medium mb-2 block">Équipements</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'ascenseur' as const, label: 'Ascenseur', show: type === 'appartement' },
                      { key: 'balconTerrasse' as const, label: 'Balcon / Terrasse' },
                      { key: 'parking' as const, label: 'Parking' },
                      { key: 'cave' as const, label: 'Cave' },
                    ].filter(item => item.show !== false).map((item) => {
                      const checked = !!watch(item.key)
                      return (
                        <button
                          type="button"
                          key={item.key}
                          role="switch"
                          aria-checked={checked}
                          onClick={() => setValue(item.key, !checked)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                            checked
                              ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-green font-medium' 
                              : 'border-aquiz-gray-lighter text-aquiz-gray hover:border-aquiz-gray-light'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                          {item.label}
                        </button>
                      )
                    })}
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
            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  Veuillez corriger les erreurs suivantes :
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-xs">
                  {validationErrors.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </div>
            )}
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
