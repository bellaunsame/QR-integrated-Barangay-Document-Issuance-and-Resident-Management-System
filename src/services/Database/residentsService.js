import { supabase } from '../supabaseClient';

export const residentsService = {
  async create(residentData) {
    const { data, error } = await supabase
      .from('residents')
      .insert(residentData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .order('last_name');
    
    if (error) throw error;
    return data;
  }
};