'use client'

import { useState } from 'react'

interface FileDiffLine {
  type: 'add' | 'remove' | 'context' | 'header'
  oldLineNumber?: number
  newLineNumber?: number
  content: string
}

interface FileDiffViewerProps {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
  additions: number
  deletions: number
  patch?: string
  previousFilename?: string
}

function parsePatch(patch: string): FileDiffLine[] {
  const lines = patch.split('\n')
  const result: FileDiffLine[] = []
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header like @@ -1,3 +1,4 @@
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLineNum = parseInt(match[1], 10)
        newLineNum = parseInt(match[2], 10)
      }
      result.push({
        type: 'header',
        content: line,
      })
    } else if (line.startsWith('+')) {
      result.push({
        type: 'add',
        newLineNumber: newLineNum++,
        content: line.substring(1),
      })
    } else if (line.startsWith('-')) {
      result.push({
        type: 'remove',
        oldLineNumber: oldLineNum++,
        content: line.substring(1),
      })
    } else {
      result.push({
        type: 'context',
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
        content: line.substring(1),
      })
    }
  }

  return result
}

export function FileDiffViewer({
  filename,
  status,
  additions,
  deletions,
  patch,
  previousFilename,
}: FileDiffViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusColors: Record<typeof status, string> = {
    added: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    removed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    modified: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    renamed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    copied: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    changed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    unchanged: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
  }

  const lines = patch ? parsePatch(patch) : []

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {/* File Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-zinc-50 dark:bg-zinc-800 px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
            {filename}
          </span>
          {previousFilename && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              (renamed from {previousFilename})
            </span>
          )}
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[status]}`}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            {additions > 0 && (
              <span className="text-green-600 dark:text-green-400">
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span className="text-red-600 dark:text-red-400">
                -{deletions}
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Diff Content */}
      {isExpanded && patch && (
        <div className="bg-white dark:bg-zinc-900 overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <tbody>
              {lines.map((line, index) => {
                const bgClass =
                  line.type === 'add'
                    ? 'bg-green-50 dark:bg-green-950'
                    : line.type === 'remove'
                    ? 'bg-red-50 dark:bg-red-950'
                    : line.type === 'header'
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : ''

                const textClass =
                  line.type === 'header'
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : 'text-zinc-900 dark:text-zinc-100'

                return (
                  <tr key={index} className={bgClass}>
                    <td className="px-2 py-0.5 text-right text-zinc-400 dark:text-zinc-500 select-none w-12 border-r border-zinc-200 dark:border-zinc-700">
                      {line.oldLineNumber ?? ''}
                    </td>
                    <td className="px-2 py-0.5 text-right text-zinc-400 dark:text-zinc-500 select-none w-12 border-r border-zinc-200 dark:border-zinc-700">
                      {line.newLineNumber ?? ''}
                    </td>
                    <td className={`px-2 py-0.5 ${textClass}`}>
                      <pre className="whitespace-pre-wrap break-all">
                        {line.content}
                      </pre>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {isExpanded && !patch && (
        <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No diff available for this file
        </div>
      )}
    </div>
  )
}
