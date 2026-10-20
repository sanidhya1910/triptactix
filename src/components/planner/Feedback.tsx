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
import { allItems, formatINR, sumItems } from '@/lib/planner/calc'
import { selectActive, useTrip } from '@/lib/planner/store'

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

/** Says so, once, if the browser stops accepting saves, instead of losing work quietly. */
export function SaveFailedNotice() {
  const failed = useTrip((s) => s.saveFailed)
  useEffect(() => {
    if (!failed) return
    sonner.error('Changes aren’t being saved on this device', {
      id: 'planner-save-failed',
      description: 'Storage is full or turned off. Download the budget to keep a copy.',
      duration: Infinity,
    })
    return () => {
      sonner.dismiss('planner-save-failed')
    }
  }, [failed])
  return null
}

export function RemoveDayDialog() {
  const trip = useTrip(selectActive)
  const id = useTrip((s) => s.confirmDayId)
  const cancel = useTrip((s) => s.cancelRemoveDay)
  const remove = useTrip((s) => s.removeDay)
  const index = trip?.days.findIndex((d) => d.id === id) ?? -1
  const day = index >= 0 ? trip!.days[index] : undefined

  return (
    <Dialog open={!!day} onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="max-w-md">
        {day && (
          <>
            <DialogHeader>
              <DialogTitle>Remove day {index + 1}?</DialogTitle>
              <DialogDescription>
                {day.title || `Day ${index + 1}`} has {day.items.length} {day.items.length === 1 ? 'cost' : 'costs'} totalling{' '}
                <span className="font-mono text-ink [font-variant-numeric:tabular-nums]">{formatINR(sumItems(day.items))}</span>.
                You can undo this straight after.
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

export function RemovePersonDialog() {
  const trip = useTrip(selectActive)
  const id = useTrip((s) => s.confirmPersonId)
  const cancel = useTrip((s) => s.cancelRemovePerson)
  const remove = useTrip((s) => s.removePerson)
  const person = trip?.people.find((p) => p.id === id)

  const items = trip && person ? allItems(trip) : []
  const paid = items.filter((i) => i.paidBy === person?.id)
  const shared = items.filter((i) => person && i.sharedBy.includes(person.id))
  const name = person?.name || 'this traveller'

  return (
    <Dialog open={!!person} onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="max-w-md">
        {person && (
          <>
            <DialogHeader>
              <DialogTitle>Remove {name}?</DialogTitle>
              <DialogDescription>
                {paid.length > 0 && (
                  <>
                    {name} paid for {paid.length} {paid.length === 1 ? 'cost' : 'costs'} (
                    <span className="font-mono text-ink [font-variant-numeric:tabular-nums]">{formatINR(sumItems(paid))}</span>
                    ), which will go back to having no payer.{' '}
                  </>
                )}
                {shared.length > 0 && (
                  <>
                    {shared.length} {shared.length === 1 ? 'cost' : 'costs'} shared by a chosen group will no longer include{' '}
                    {name}.{' '}
                  </>
                )}
                You can undo this straight after.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={cancel} autoFocus>
                Keep {person.name || 'traveller'}
              </Button>
              <Button variant="destructive" onClick={() => remove(person.id)}>
                Remove
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
