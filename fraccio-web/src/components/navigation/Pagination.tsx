import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '../ui/button'

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  ...props
}) => {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)
    const showLeftEllipsis = leftSiblingIndex > 2
    const showRightEllipsis = rightSiblingIndex < totalPages - 1

    // Left side pages
    for (let i = 1; i <= Math.min(2, totalPages); i++) {
      pages.push(i)
    }

    // Left ellipsis
    if (showLeftEllipsis) {
      pages.push('left-ellipsis')
    }

    // Middle pages
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i > 2 && i < totalPages - 1) {
        pages.push(i)
      }
    }

    // Right ellipsis
    if (showRightEllipsis) {
      pages.push('right-ellipsis')
    }

    // Right side pages
    for (let i = Math.max(totalPages - 1, 3); i <= totalPages; i++) {
      if (!pages.includes(i)) {
        pages.push(i)
      }
    }

    return pages
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('flex items-center justify-center gap-1', className)}
      {...props}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => {
          if (page === 'left-ellipsis' || page === 'right-ellipsis') {
            return (
              <span key={`${page}-${index}`} className="px-2 text-foreground/50">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            )
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="min-w-10"
            >
              {page}
            </Button>
          )
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

export { Pagination }
