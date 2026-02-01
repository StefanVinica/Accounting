import { supabase, storage } from './supabase'

const EXPORTS_BUCKET = 'exports'

/**
 * List all merge jobs for a user
 */
export async function listMergeJobs(userId) {
  const { data, error } = await supabase
    .from('merge_jobs')
    .select(`
      *,
      merge_job_files(
        file_id,
        order_index,
        files(id, file_name, record_count)
      )
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single merge job with full details
 */
export async function getMergeJob(jobId) {
  const { data, error } = await supabase
    .from('merge_jobs')
    .select(`
      *,
      merge_job_files(
        file_id,
        order_index,
        files(id, file_name, record_count, status)
      ),
      output_file:files!output_file_id(id, file_name, storage_path)
    `)
    .eq('id', jobId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new merge job
 */
export async function createMergeJob(userId, name, fileIds) {
  // Validate - need at least 2 files
  if (fileIds.length < 2) {
    throw new Error('At least 2 files are required to merge')
  }

  // Create the merge job
  const { data: job, error: jobError } = await supabase
    .from('merge_jobs')
    .insert({
      owner_id: userId,
      name: name || `Merge ${new Date().toLocaleDateString('mk-MK')}`,
      status: 'pending'
    })
    .select()
    .single()

  if (jobError) throw jobError

  // Create merge_job_files entries
  const jobFiles = fileIds.map((fileId, index) => ({
    merge_job_id: job.id,
    file_id: fileId,
    order_index: index
  }))

  const { error: filesError } = await supabase
    .from('merge_job_files')
    .insert(jobFiles)

  if (filesError) {
    // Clean up job if files insert fails
    await supabase.from('merge_jobs').delete().eq('id', job.id)
    throw filesError
  }

  return job
}

/**
 * Get merged records for a job
 */
export async function getMergeResult(jobId) {
  // Get the job with files
  const job = await getMergeJob(jobId)

  if (!job) throw new Error('Merge job not found')

  // Get file IDs
  const fileIds = job.merge_job_files.map(mjf => mjf.file_id)

  // Fetch all records from these files
  const { data: records, error } = await supabase
    .from('records')
    .select('*, files!inner(file_name)')
    .in('file_id', fileIds)
    .order('data', { ascending: true })

  if (error) throw error

  // Calculate stats
  const stats = calculateMergeStats(records, job.merge_job_files)

  return {
    job,
    records,
    stats
  }
}

/**
 * Calculate merge statistics
 */
function calculateMergeStats(records, mergeJobFiles) {
  const stats = {
    totalRecords: records.length,
    totalDolguja: 0,
    totalPobaruva: 0,
    balance: 0,
    bySource: {},
    overlappingInvoices: new Set()
  }

  const invoiceCounts = {}

  for (const record of records) {
    const dolguja = parseFloat(record.dolguja) || 0
    const pobaruva = parseFloat(record.pobaruva) || 0
    const sourceName = record.files?.file_name || 'Unknown'

    stats.totalDolguja += dolguja
    stats.totalPobaruva += pobaruva

    // Track by source
    if (!stats.bySource[sourceName]) {
      stats.bySource[sourceName] = { count: 0, dolguja: 0, pobaruva: 0 }
    }
    stats.bySource[sourceName].count++
    stats.bySource[sourceName].dolguja += dolguja
    stats.bySource[sourceName].pobaruva += pobaruva

    // Track overlapping invoice numbers (records with same invoice across files)
    if (record.invoice_number) {
      invoiceCounts[record.invoice_number] = (invoiceCounts[record.invoice_number] || 0) + 1
    }
  }

  stats.balance = stats.totalPobaruva - stats.totalDolguja

  // Find overlapping invoice numbers (appear in multiple records)
  for (const [invoice, count] of Object.entries(invoiceCounts)) {
    if (count > 1) {
      stats.overlappingInvoices.add(invoice)
    }
  }
  stats.overlapCount = stats.overlappingInvoices.size
  stats.overlappingInvoices = Array.from(stats.overlappingInvoices)

  return stats
}

/**
 * Update merge job status
 */
export async function updateMergeJobStatus(jobId, status, additionalData = {}) {
  const { data, error } = await supabase
    .from('merge_jobs')
    .update({
      status,
      ...additionalData,
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
    })
    .eq('id', jobId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a merge job
 */
export async function deleteMergeJob(jobId) {
  const { error } = await supabase
    .from('merge_jobs')
    .delete()
    .eq('id', jobId)

  if (error) throw error
}

/**
 * Export merge result to CSV
 */
export function exportMergeToCSV(records) {
  const headers = ['Извор', 'Налог', 'Дата', 'Валута', 'М ДДВ', 'Опис', 'Затворање', 'Забелешка', 'Долгува', 'Побарува']
  const fields = ['source', 'nalog', 'data', 'valuta', 'm_ddv', 'opis', 'zatvoranje', 'zabeleska', 'dolguja', 'pobaruva']

  const csvRows = [headers.join(',')]

  for (const record of records) {
    const row = fields.map(field => {
      let value
      if (field === 'source') {
        value = record.files?.file_name || ''
      } else {
        value = record[field] ?? ''
      }
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
