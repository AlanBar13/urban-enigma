import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

const nav = () => screen.getByRole('navigation', { name: 'pagination' })
// prev and next are the first/last buttons; the page buttons sit between them
const buttons = () => within(nav()).getAllByRole('button')
const pageLabels = () =>
  buttons()
    .slice(1, -1)
    .map((b) => b.textContent)

describe('Pagination', () => {
  it('lists every page without ellipsis when the range is small', () => {
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />,
    )
    expect(pageLabels()).toEqual(['1', '2', '3'])
  })

  it('collapses the middle with ellipsis on a long range', () => {
    render(
      <Pagination currentPage={10} totalPages={20} onPageChange={() => {}} />,
    )
    expect(pageLabels()).toEqual(['1', '2', '9', '10', '11', '19', '20'])
    // two ellipsis spans, one either side of the sibling window
    expect(nav().querySelectorAll('span').length).toBe(2)
  })

  it('disables prev on the first page and next on the last', () => {
    const { unmount } = render(
      <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />,
    )
    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(true)
    expect((buttons().at(-1) as HTMLButtonElement).disabled).toBe(false)
    unmount()

    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />,
    )
    expect((buttons()[0] as HTMLButtonElement).disabled).toBe(false)
    expect((buttons().at(-1) as HTMLButtonElement).disabled).toBe(true)
  })

  it('reports the clicked page', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />,
    )
    fireEvent.click(screen.getByText('4'))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('steps one page with prev and next', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />,
    )
    fireEvent.click(buttons()[0])
    expect(onPageChange).toHaveBeenLastCalledWith(2)
    fireEvent.click(buttons().at(-1)!)
    expect(onPageChange).toHaveBeenLastCalledWith(4)
  })
})
