import { supabase } from './supabase'

/**
 * List all clients for an accountant
 */
export async function listClients(accountantId) {
  const { data, error } = await supabase
    .from('client_relationships')
    .select(`
      *,
      client:profiles!client_id(id, email, full_name, company_name)
    `)
    .eq('accountant_id', accountantId)
    .order('invited_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Invite a new client
 */
export async function inviteClient(accountantId, clientEmail) {
  // Generate a secure random token
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')

  // Check if client already exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', clientEmail)
    .single()

  // Create relationship
  const { data, error } = await supabase
    .from('client_relationships')
    .insert({
      accountant_id: accountantId,
      client_id: existingProfile?.id || null,
      status: 'pending',
      invite_token: token,
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    })
    .select()
    .single()

  if (error) throw error

  // TODO: Send invitation email via Edge Function
  // For now, return the token for testing
  return { ...data, invite_token: token }
}

/**
 * Get invitation details by token
 */
export async function getInvitation(token) {
  const { data, error } = await supabase
    .from('client_relationships')
    .select(`
      *,
      accountant:profiles!accountant_id(id, email, full_name, company_name)
    `)
    .eq('invite_token', token)
    .single()

  if (error) throw error

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    throw new Error('Invitation has expired')
  }

  // Check if already accepted
  if (data.status !== 'pending') {
    throw new Error('Invitation has already been used')
  }

  return data
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token, clientId) {
  const { data, error } = await supabase
    .from('client_relationships')
    .update({
      client_id: clientId,
      status: 'active',
      accepted_at: new Date().toISOString(),
      invite_token: null // Clear token after use
    })
    .eq('invite_token', token)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Resend invitation email
 */
export async function resendInvitation(relationshipId) {
  // Generate new token and extend expiry
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')

  const { data, error } = await supabase
    .from('client_relationships')
    .update({
      invite_token: token,
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', relationshipId)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) throw error

  // TODO: Send invitation email via Edge Function
  return { ...data, invite_token: token }
}

/**
 * Update relationship status
 */
export async function updateRelationshipStatus(relationshipId, status) {
  const { data, error } = await supabase
    .from('client_relationships')
    .update({ status })
    .eq('id', relationshipId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a client relationship
 */
export async function removeClient(relationshipId) {
  const { error } = await supabase
    .from('client_relationships')
    .delete()
    .eq('id', relationshipId)

  if (error) throw error
}
