import { supabase } from '../supabaseClient';

export const templatesService = {
  /**
   * Create a new document template
   * Handles the mismatch between frontend data and database schema
   */
  async create(templateData) {
    // Construct the payload based on your table structure
    const payload = {
      template_name: templateData.template_name,
      template_code: templateData.template_code.toUpperCase(),
      template_content: templateData.template_content,
      // Uncommented to resolve the 'description' column error
      description: templateData.description || '', 
      required_fields: templateData.required_fields || [], // Supabase handles arrays/JSON well
      is_active: templateData.is_active ?? true
    };

    const { data, error } = await supabase
      .from('document_templates')
      .insert(payload)
      .select(); // Fetches the created record to verify all columns match the schema cache

    if (error) {
      console.error("Supabase Create Error Details:", error);
      throw error;
    }

    // Returns the first item of the array (the newly created template)
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Fetch all templates ordered by name
   */
  async getAll() {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('template_name');
    
    if (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
    
    return data || [];
  },

  /**
   * Update an existing template
   */
  async update(id, templateData) {
    const { data, error } = await supabase
      .from('document_templates')
      .update({
        ...templateData,
        template_code: templateData.template_code?.toUpperCase()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a template
   */
  async delete(id) {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};

export default templatesService;