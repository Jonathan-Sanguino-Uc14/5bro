'use client'

import { Button } from '@/components/ui/button'
import type { OperacionCombinada } from '@/types'

interface Props {
  data: OperacionCombinada[]
}

export function CSVExportButton({ data }: Props) {
  function handleExport() {
    const headers = ['Tipo', 'Concepto', 'Fecha', 'Monto (ARS)', 'Categoría', 'Nota', 'Fuente']
    const rows = data.map((op) => [
      op.tipo,
      `"${op.concepto.replace(/"/g, '""')}"`,
      op.fecha,
      (op.monto / 100).toFixed(2),
      op.categoria ?? '',
      `"${(op.nota ?? '').replace(/"/g, '""')}"`,
      op.fuente,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operaciones_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      Exportar CSV
    </Button>
  )
}
