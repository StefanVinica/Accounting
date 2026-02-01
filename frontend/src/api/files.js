import { supabase, storage } from './supabase'

const UPLOADS_BUCKET = 'uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['xlsx', 'xls', 'csv', 'pdf']

/**
 * Validate file before upload
 */
export function validateFile(file) {
  const errors = []

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push('File size exceeds 10MB limit')
  }

  // Check file type
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_TYPES.includes(extension)) {
    errors.push('Only Excel (.xlsx, .xls), CSV, and PDF files are allowed')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize filename for storage (remove non-ASCII characters)
 */
function sanitizeFilename(filename) {
  // Get extension
  const lastDot = filename.lastIndexOf('.')
  const ext = lastDot > 0 ? filename.slice(lastDot) : ''
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename

  // Replace non-ASCII with underscore, collapse multiple underscores
  const sanitized = name
    .replace(/[^\x00-\x7F]/g, '_')  // Replace non-ASCII
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars
    .replace(/_+/g, '_')             // Collapse multiple underscores
    .replace(/^_|_$/g, '')           // Trim underscores

  return (sanitized || 'file') + ext.toLowerCase()
}

/**
 * Upload a file to Supabase Storage and create a file record
 * @param {File} file - The file to upload
 * @param {string} userId - The owner's user ID
 * @param {Function} onProgress - Progress callback (0-100)
 */
export async function uploadFile(file, userId, onProgress = () => {}) {
  // Validate first
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '))
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const timestamp = Date.now()
  const sanitizedName = sanitizeFilename(file.name)
  const storagePath = `${userId}/${timestamp}_${sanitizedName}`

  // Upload to storage
  const { data: uploadData, error: uploadError } = await storage
    .from(UPLOADS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) throw uploadError

  // Simulate progress for now (Supabase JS doesn't provide upload progress)
  onProgress(50)

  // Create file record in database
  const { data: fileRecord, error: dbError } = await supabase
    .from('files')
    .insert({
      owner_id: userId,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      file_type: extension,
      status: 'uploaded'
    })
    .select()
    .single()

  if (dbError) {
    // Clean up storage if db insert fails
    await storage.from(UPLOADS_BUCKET).remove([storagePath])
    throw dbError
  }

  onProgress(100)
  return fileRecord
}

/**
 * List files for a user with optional filters
 */
export async function listFiles(userId, filters = {}) {
  let query = supabase
    .from('files')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.file_type) {
    query = query.eq('file_type', filters.file_type)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

/**
 * Get a single file by ID
 */
export async function getFile(fileId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a file (storage and database record)
 */
export async function deleteFile(fileId, storagePath) {
  // Delete from storage
  const { error: storageError } = await storage
    .from(UPLOADS_BUCKET)
    .remove([storagePath])

  if (storageError) throw storageError

  // Delete database record (records will cascade delete)
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)

  if (dbError) throw dbError
}

/**
 * Get download URL for a file
 */
export async function getFileDownloadUrl(storagePath) {
  const { data, error } = await storage
    .from(UPLOADS_BUCKET)
    .createSignedUrl(storagePath, 3600) // 1 hour expiry

  if (error) throw error
  return data.signedUrl
}

/**
 * Update file status
 */
export async function updateFileStatus(fileId, status, additionalData = {}) {
  const { data, error } = await supabase
    .from('files')
    .update({
      status,
      ...additionalData,
      ...(status === 'processed' ? { processed_at: new Date().toISOString() } : {})
    })
    .eq('id', fileId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Process a file using the Edge Function
 * @param {string} fileId - The file ID to process
 */
export async function processFile(fileId) {
  const { data, error } = await supabase.functions.invoke('process-file', {
    body: { fileId }
  })

  if (error) throw error
  return data
}
