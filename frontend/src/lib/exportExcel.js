import * as XLSX from 'xlsx'

/**
 * Export array of objects ke file Excel
 * @param {Array} data - array of objects
 * @param {Array} columns - [{ key: 'name', label: 'Nama' }]
 * @param {String} filename - nama file tanpa .xlsx
 */
export function exportToExcel(data, columns, filename = 'export') {
  if (!data || data.length === 0) {
    throw new Error('Tidak ada data untuk di-export')
  }

  const rows = data.map((item) => {
    const row = {}
    columns.forEach((col) => {
      row[col.label] = item[col.key] ?? ''
    })
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()

  // Auto column width
  const colWidths = columns.map((col) => ({
    wch:
      Math.max(
        col.label.length,
        ...rows.map((r) => String(r[col.label] || '').length)
      ) + 2,
  }))
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, 'Data')

  const ts = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${ts}.xlsx`)
}
