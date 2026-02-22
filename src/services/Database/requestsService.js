import { supabase } from './supabaseClient';

export const requestsService = {
  // Fetch all requests with joined resident and template data
  async getAll() {
    const { data, error } = await supabase
      .from('document_requests')
      .select(`
        *,
        resident:residents(*),
        template:document_templates(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Create the new request
  async create(requestData) {
    const { data, error } = await supabase
      .from('document_requests')
      .insert([requestData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update status (e.g., from 'pending' to 'completed')
  async updateStatus(id, status, userId, additionalData = {}) {
    const { data, error } = await supabase
      .from('document_requests')
      .update({ 
        status, 
        processed_by: userId,
        processed_at: new Date().toISOString(),
        ...additionalData 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};