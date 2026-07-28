import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardLayout } from './DashboardLayout'

describe('DashboardLayout', () => {
  it('renders header, sidebar and content', () => {
    render(
      <DashboardLayout header={<span>Fraccio</span>} sidebar={<nav>menu</nav>}>
        <p>contenido</p>
      </DashboardLayout>,
    )
    expect(screen.getByText('Fraccio')).toBeTruthy()
    expect(screen.getByText('menu')).toBeTruthy()
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('has no sidebar toggle without a header', () => {
    render(
      <DashboardLayout sidebar={<nav>menu</nav>}>contenido</DashboardLayout>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('slides the mobile sidebar in and out', () => {
    const { container } = render(
      <DashboardLayout header={<span>Fraccio</span>} sidebar={<nav>menu</nav>}>
        contenido
      </DashboardLayout>,
    )
    const aside = container.querySelector('aside')!
    // the open/closed state is only observable as a transform class
    expect(aside.className).toContain('-translate-x-full')

    fireEvent.click(screen.getByRole('button'))
    expect(aside.className).not.toContain('-translate-x-full')

    fireEvent.click(screen.getByRole('button'))
    expect(aside.className).toContain('-translate-x-full')
  })
})
