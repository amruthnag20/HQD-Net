import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import type { ColumnProfile, DatasetPreview } from '../types/dataset'

type Props = {
  preview: DatasetPreview
  columns: ColumnProfile[]
}

const PAGE_SIZE = 25

/** Paginated preview grid — never mounts more than one page's worth of rows,
 *  so this stays cheap regardless of dataset size (Phase 1 performance
 *  requirement: no rendering thousands of DOM nodes for a preview). */
export function DatasetPreviewTable({ preview, columns }: Props) {
  const [page, setPage] = useState(0)
  const columnByName = useMemo(() => new Map(columns.map((c) => [c.name, c])), [columns])

  const pageCount = Math.max(1, Math.ceil(preview.rows.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const start = clampedPage * PAGE_SIZE
  const pageRows = preview.rows.slice(start, start + PAGE_SIZE)

  return (
    <Panel eyebrow="Preview" title="First rows">
      <div className="overflow-x-auto rounded-xl border border-line-subtle">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-subtle">
              {preview.headers.map((header) => {
                const profile = columnByName.get(header)
                return (
                  <th key={header} className="whitespace-nowrap px-3 py-2 align-bottom">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-primary">{header}</span>
                      {profile && (
                        <Badge tone={profile.dtype === 'empty' ? 'danger' : 'neutral'} className="w-fit">
                          {profile.dtype}
                        </Badge>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIndex) => (
              <tr key={start + rowIndex} className="border-b border-line-subtle last:border-0 hover:bg-surface-subtle">
                {preview.headers.map((_, colIndex) => (
                  <td key={colIndex} className="whitespace-nowrap px-3 py-2 font-mono text-xs text-secondary">
                    {row[colIndex] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted">
          Rows {preview.rows.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, preview.rows.length)} of{' '}
          {preview.rows.length.toLocaleString()}
          {preview.truncated ? ' (preview capped)' : ''}
        </p>
        <div className="flex items-center gap-2">
          <IconButton
            icon={<ChevronLeft className="size-4" />}
            aria-label="Previous page"
            size="sm"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          />
          <IconButton
            icon={<ChevronRight className="size-4" />}
            aria-label="Next page"
            size="sm"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          />
        </div>
      </div>
    </Panel>
  )
}
