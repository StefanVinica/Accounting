import { supabase } from './supabase'

/**
 * List records with filters, pagination, and sorting
 */
export async function listRecords(userId, options = {}) {
  const {
    fileId,
    search,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50,
    sortBy = 'data',
    sortDesc = true
  } = options

  let query = supabase
    .from('records')
    .select('*, files!inner(file_name)', { count: 'exact' })
    .eq('owner_id', userId)

  // Filter by file
  if (fileId) {
    query = query.eq('file_id', fileId)
  }

  // Search in nalog or opis
  if (search) {
    query = query.or(`nalog.ilike.%${search}%,opis.ilike.%${search}%`)
  }

  // Date range filters
  if (dateFrom) {
    query = query.gte('data', dateFrom)
  }
  if (dateTo) {
    query = query.lte('data', dateTo)
  }

  // Sorting
  query = query.order(sortBy, { ascending: !sortDesc })

  // Pagination
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  return {
    records: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit)
  }
}

/**
 * Get records for a specific file
 */
export async function getRecordsByFile(fileId) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('file_id', fileId)
    .order('row_number', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get record statistics for a user or file
 */
export async function getRecordStats(userId, fileId = null) {
  let query = supabase
    .from('records')
    .select('dolguja, pobaruva, file_id')
    .eq('owner_id', userId)

  if (fileId) {
    query = query.eq('file_id', fileId)
  }

  const { data, error } = await query

  if (error) throw error

  // Calculate stats
  const stats = {
    totalRecords: data.length,
    totalDolguja: 0,
    totalPobaruva: 0,
    balance: 0,
    byFile: {}
  }

  for (const record of data) {
    const dolguja = parseFloat(record.dolguja) || 0
    const pobaruva = parseFloat(record.pobaruva) || 0

    stats.totalDolguja += dolguja
    stats.totalPobaruva += pobaruva

    // Group by file
    if (!stats.byFile[record.file_id]) {
      stats.byFile[record.file_id] = { count: 0, dolguja: 0, pobaruva: 0 }
    }
    stats.byFile[record.file_id].count++
    stats.byFile[record.file_id].dolguja += dolguja
    stats.byFile[record.file_id].pobaruva += pobaruva
  }

  stats.balance = stats.totalPobaruva - stats.totalDolguja

  return stats
}

/**
 * Export records to CSV format
 */
export function exportToCSV(records) {
  const headers = ['Налог', 'Дата', 'Валута', 'М ДДВ', 'Опис', 'Затворање', 'Забелешка', 'Долгува', 'Побарува', 'Единица']
  const fields = ['nalog', 'data', 'valuta', 'm_ddv', 'opis', 'zatvoranje', 'zabeleska', 'dolguja', 'pobaruva', 'edin']

  const csvRows = [headers.join(',')]

  for (const record of records) {
    const row = fields.map(field => {
      let value = record[field] ?? ''
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(row.join(','))
  }

  return csvRows.join('\n')
}
