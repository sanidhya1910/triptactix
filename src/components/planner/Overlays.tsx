import { useEffect } from 'react'
import { formatINR, sumItems } from '@/lib/planner/calc'
import { useTrip } from '@/lib/planner/store'

export function Toast() {
  const toast = useTrip((s) => s.toast)
  const undo = useTrip((s) => s.undo)
  const dismiss = useTrip((s) => s.dismissToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismiss, toast.undo ? 8000 : 2500)
    return () => clearTimeout(t)
  }, [toast, dismiss])
  if (!toast) return null
  return (
    <div
      role="status"
      className="tp-no-print fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-4 rounded-xl bg-tp-ink px-4 py-3 text-[17px] font-semibold text-tp-bg shadow-xl"
    >
      <span>{toast.message}</span>
      {toast.undo && (
        <button onClick={undo} className="min-h-12 rounded-lg bg-tp-bg px-4 font-bold text-tp-ink">
          Undo
        </button>
      )}
    </div>
  )
}

export function ConfirmDialog() {
  const id = useTrip((s) => s.confirmDayId)
  const day = useTrip((s) => s.trip.days.find((d) => d.id === id))
  const index = useTrip((s) => s.trip.days.findIndex((d) => d.id === id))
  const cancel = useTrip((s) => s.cancelRemoveDay)
  const remove = useTrip((s) => s.removeDay)
  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, cancel])
  if (!id || !day) return null
  return (
    <div className="tp-no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div role="alertdialog" aria-modal aria-labelledby="cd-title" className="w-full max-w-md rounded-2xl bg-tp-surface p-6 shadow-2xl">
        <h2 id="cd-title" className="text-2xl font-bold">
          Remove Day {index + 1}?
        </h2>
        <p className="mt-2 text-[17px]">
          {day.title || `Day ${index + 1}`} has {day.items.length} {day.items.length === 1 ? 'item' : 'items'} worth{' '}
          {formatINR(sumItems(day.items))}. You can undo this right after.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button autoFocus className="tp-btn" onClick={cancel}>
            Keep day
          </button>
          <button className="tp-btn !border-tp-danger !bg-tp-danger !text-tp-bg" onClick={() => remove(id)}>
            Remove day
          </button>
        </div>
      </div>
    </div>
  )
}
