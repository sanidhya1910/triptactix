import { Airplane, Bed, Car, DotsThree, ForkKnife, MapPin, Receipt } from '@phosphor-icons/react/ssr'
import type { Icon } from '@phosphor-icons/react'
import type { ItemKind } from '@/lib/planner/types'
import { cn } from '@/lib/utils'

/**
 * Kinds are told apart by icon and label, not by colour. The site palette keeps its
 * pastels for meaning (good, rising, caution, info), so painting seven categories in
 * seven hues would both break the theme and imply judgements the data does not make.
 */
export const KIND_ICON: Record<ItemKind, Icon> = {
  place: MapPin,
  cab: Car,
  food: ForkKnife,
  stay: Bed,
  fees: Receipt,
  flight: Airplane,
  other: DotsThree,
}

/** Short labels for the add buttons, where "Tolls and fees" would crowd the row. */
export const KIND_SHORT: Record<ItemKind, string> = {
  place: 'Place',
  cab: 'Cab',
  food: 'Food',
  stay: 'Stay',
  fees: 'Fees',
  flight: 'Flight',
  other: 'Other',
}

/** Order of the add buttons: the things people add most often come first. */
export const ADD_ORDER: ItemKind[] = ['place', 'cab', 'food', 'stay', 'fees', 'flight', 'other']

export function KindIcon({ kind, className }: { kind: ItemKind; className?: string }) {
  const Glyph = KIND_ICON[kind]
  return <Glyph aria-hidden className={cn('h-4 w-4', className)} weight="regular" />
}

/** The icon on a quiet tile, used at the start of each row. */
export function KindTile({ kind, className }: { kind: ItemKind; className?: string }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-secondary',
        className,
      )}
    >
      <KindIcon kind={kind} />
    </span>
  )
}
