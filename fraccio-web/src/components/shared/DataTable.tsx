import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, Pencil, Trash } from 'lucide-react'
import { Button } from '../ui/button'

export interface DataTableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  className?: string
  width?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void
  sortKey?: keyof T
  sortDirection?: 'asc' | 'desc'
  className?: string
  hoverable?: boolean
  striped?: boolean
  dense?: boolean
  actions?: boolean
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
}

export const DataTable = React.forwardRef<
  HTMLTableElement,
  DataTableProps<any>
>(
  (
    {
      columns,
      data,
      onSort,
      sortKey,
      sortDirection,
      className,
      hoverable = true,
      striped = false,
      dense = false,
      actions = false,
      onEdit,
      onDelete,
    },
    ref
  ) => {
    const handleSort = (key: any) => {
      if (!onSort) return
      const newDirection =
        sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
      onSort(key, newDirection)
    }

    return (
      <div className="overflow-x-auto rounded-lg bg-card">
        <table
          ref={ref}
          className={cn(
            'w-full text-sm border-collapse',
            className
          )}
        >
          <thead>
            <tr className="bg-[var(--surface-container-low)]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-[var(--on-surface-variant)]',
                    dense && 'py-2 px-3',
                    col.className
                  )}
                  style={{ width: col.width }}
                >
                  {col.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="flex items-center gap-2">
                        {col.label}
                        {sortKey === col.key && (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        )}
                      </span>
                    </Button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {actions && (
                <>
                  <th>
                    <span>Editar</span>
                  </th>
                  <th>
                    <span>Borrar</span>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn(
                    'px-4 py-8 text-center text-[var(--on-surface-variant)]',
                    dense && 'py-4 px-3'
                  )}
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'transition-colors',
                    striped && idx % 2 === 0 && 'bg-[var(--surface-container-low)]',
                    hoverable && 'hover:bg-[var(--surface-container-highest)]'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-4 text-[var(--on-surface)]',
                        dense && 'py-2 px-3 text-xs',
                        col.className
                      )}
                      style={{ width: col.width }}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] || '')}
                    </td>
                  ))}
                  {actions && (
                    <>
                      <td className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => onEdit && onEdit(row)} className="text-blue-500 hover:text-blue-700"><Pencil className="h-4 w-4" /></Button>
                      </td>
                      <td className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => onDelete && onDelete(row)} className="text-red-500 hover:text-red-700"><Trash className="h-4 w-4" /></Button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }
)

DataTable.displayName = 'DataTable'
