import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Item } from '@/lib/planner/types'
import { ItemRow } from './ItemRow'

export function ItemList({ items, emptyText }: { items: Item[]; emptyText: string }) {
  return (
    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="flex min-h-24 items-center justify-center rounded-xl border-2 border-dashed border-tp-line px-4 text-center text-[17px] font-semibold text-tp-ink2">
            {emptyText}
          </div>
        )}
        {items.map((i) => (
          <ItemRow key={i.id} item={i} />
        ))}
      </div>
    </SortableContext>
  )
}
