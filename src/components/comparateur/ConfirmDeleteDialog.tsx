'use client'

/**
 * Dialog de confirmation de suppression
 * Utilisé pour la suppression unitaire et bulk
 */

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface ConfirmDeleteDialogProps {
  /** Dialog ouvert ou fermé */
  open: boolean
  /** Callback de fermeture */
  onClose: () => void
  /** Callback de confirmation */
  onConfirm: () => void
  /** Nombre d'annonces à supprimer */
  count: number
  /** Titre de l'annonce (pour suppression unitaire) */
  annonceTitle?: string
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  count,
  annonceTitle
}: ConfirmDeleteDialogProps) {
  const isBulk = count > 1

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-aquiz-black">
              {isBulk
                ? `Supprimer ${count} annonces ?`
                : 'Supprimer cette annonce ?'
              }
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-aquiz-gray leading-relaxed pl-13">
            {isBulk ? (
              <>
                <strong>{count} annonces</strong> seront définitivement supprimées du comparateur.
                Cette action est irréversible.
              </>
            ) : (
              <>
                {annonceTitle ? (
                  <>L&apos;annonce <strong>&quot;{annonceTitle}&quot;</strong> sera</>
                ) : (
                  <>Cette annonce sera</>
                )}
                {' '}définitivement supprimée du comparateur.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-xl text-xs h-9 font-medium border-aquiz-gray-lighter">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl text-xs h-9 font-semibold bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {isBulk ? `Supprimer (${count})` : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
