import { useEffect } from 'react'
import { toast as sonner } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatINR, sumItems } from '@/lib/planner/calc'
import { useTrip } from '@/lib/planner/store'

/**
 * The store owns undo; this only renders it through the site's sonner toaster.
 * Each toast is bound to the store toast id it was created for, so an older toast
 * still on screen can never trigger a newer deletion's undo.
 */
export function UndoToasts() {
  const toast = useTrip((s) => s.toast)

  useEffect(() => {
    if (!toast) return
    const { undo, dismissToast } = useTrip.getState()
    const isCurrent = () => useTrip.getState().toast?.id === toast.id
    const release = () => isCurrent() && dismissToast()

    const sid = sonner(toast.message, {
      id: `planner-${toast.id}`,
      duration: toast.undo ? 8000 : 3000,
      action: toast.undo ? { label: 'Undo', onClick: () => isCurrent() && undo() } : undefined,
      onDismiss: release,
      onAutoClose: release,
    })
    return () => {
      sonner.dismiss(sid)
    }
  }, [toast])

  return null
}

export function RemoveDayDialog() {
  const id = useTrip((s) => s.confirmDayId)
  const day = useTrip((s) => s.trip.days.find((d) => d.id === s.confirmDayId))
  const index = useTrip((s) => s.trip.days.findIndex((d) => d.id === s.confirmDayId))
  const cancel = useTrip((s) => s.cancelRemoveDay)
  const remove = useTrip((s) => s.removeDay)

  return (
    <Dialog open={!!id && !!day} onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="max-w-md">
        {day && (
          <>
            <DialogHeader>
              <DialogTitle>Remove day {index + 1}?</DialogTitle>
              <DialogDescription>
                {day.title || `Day ${index + 1}`} has {day.items.length}{' '}
                {day.items.length === 1 ? 'cost' : 'costs'} totalling{' '}
                <span className="font-mono text-ink [font-variant-numeric:tabular-nums]">
                  {formatINR(sumItems(day.items))}
                </span>
                . You can undo this straight after.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={cancel} autoFocus>
                Keep day
              </Button>
              <Button variant="destructive" onClick={() => remove(day.id)}>
                Remove day
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
