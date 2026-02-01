import { supabase, auth } from './supabase'

/**
 * Sign up a new user with email and password
 * @param {string} email
 * @param {string} password
 * @param {Object} metadata - Additional user metadata (role, full_name, company_name)
 */
export async function signUp(email, password, metadata = {}) {
  const { data, error } = await auth.signUp({
    email,
    password,
    options: {
      data: {
        role: metadata.role || 'client',
        full_name: metadata.full_name || '',
        company_name: metadata.company_name || '',
      }
    }
  })

  if (error) throw error
  return data
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  const { data, error } = await auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return data
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await auth.signOut()
  if (error) throw error
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data: { session }, error } = await auth.getSession()
  if (error) throw error
  return session
}

/**
 * Get the current user
 */
export async function getUser() {
  const { data: { user }, error } = await auth.getUser()
  if (error) throw error
  return user
}

/**
 * Get the user's profile from the profiles table
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Update the user's profile
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  const { error } = await auth.resetPasswordForEmail(email)
  if (error) throw error
}

/**
 * Update password
 */
export async function updatePassword(newPassword) {
  const { error } = await auth.updateUser({ password: newPassword })
  if (error) throw error
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback) {
  return auth.onAuthStateChange(callback)
}
