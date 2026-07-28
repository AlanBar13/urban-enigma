import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTable } from './DataTable'
import type { DataTableColumn } from './DataTable'

type Row = { name: string; amount: number }

const columns: Array<DataTableColumn<Row>> = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'amount', label: 'Monto', render: (v) => `$${v}` },
]

const data: Array<Row> = [
  { name: 'Casa 1', amount: 100 },
  { name: 'Casa 2', amount: 200 },
]

describe('DataTable', () => {
  it('renders a row per item and uses the column renderer', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2
    expect(screen.getByText('Casa 1')).toBeTruthy()
    expect(screen.getByText('$200')).toBeTruthy()
  })

  it('shows an empty state with no data', () => {
    render(<DataTable columns={columns} data={[]} />)
    expect(screen.getByText('No data available')).toBeTruthy()
  })

  it('toggles sort direction on the active column', () => {
    const onSort = vi.fn()
    const { unmount } = render(
      <DataTable columns={columns} data={data} onSort={onSort} />,
    )
    fireEvent.click(screen.getByText('Nombre'))
    expect(onSort).toHaveBeenCalledWith('name', 'asc')
    unmount()

    render(
      <DataTable
        columns={columns}
        data={data}
        onSort={onSort}
        sortKey="name"
        sortDirection="asc"
      />,
    )
    fireEvent.click(screen.getByText('Nombre'))
    expect(onSort).toHaveBeenLastCalledWith('name', 'desc')
  })

  it('fires edit and delete with the row', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        actions
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    )
    // per row: 2 action buttons, in edit/delete order
    const actionButtons = screen.getAllByRole('button')
    fireEvent.click(actionButtons[0])
    fireEvent.click(actionButtons[3])
    expect(onEdit).toHaveBeenCalledWith(data[0])
    expect(onDelete).toHaveBeenCalledWith(data[1])
  })
})
