import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase configuration missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in your .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'barangay-doc-system'
    }
  }
});

/**
 * Database helper functions with error handling
 */
export const db = {
  // Users
  users: {
    getAll: async () => {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getById: async (id) => {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    // --- ADDED: This fixes the "getByEmail is not a function" error ---
    getByEmail: async (email) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      // PGRST116 is Supabase's code for "No rows found". We ignore it so it just returns null.
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data || null;
    },
    // -----------------------------------------------------------------
    create: async (userData) => {
      const { data, error} = await supabase.from('users').insert(userData).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select();
      if (error) throw error;
      return data ? data[0] : null;
    },
    delete: async (id) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    }
  },
  // Residents
  residents: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('residents')
        .select(`
          *, 
          document_requests (
            id,
            status,
            created_at,
            expiration_date,
            template:document_templates(id, template_name)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getById: async (id) => {
      const { data, error } = await supabase.from('residents').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    getByQRCode: async (qrCodeData) => {
      const { data, error } = await supabase.from('residents').select('*').eq('qr_code_data', qrCodeData).single();
      if (error) throw error;
      return data;
    },
    search: async (searchTerm) => {
      const { data, error } = await supabase
        .from('residents')
        // UPDATED HERE TOO
        .select(`
          *, 
          document_requests (
            id,
            status,
            created_at,
            template:document_templates(template_name)
          )
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (residentData) => {
      const { data, error } = await supabase.from('residents').insert(residentData).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('residents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('residents').delete().eq('id', id);
      if (error) throw error;
    }
  },
  // Templates
  templates: {
    getAll: async () => {
      const { data, error } = await supabase.from('document_templates').select('*').order('template_name');
      if (error) throw error;
      return data || [];
    },
    getActive: async () => {
      const { data, error } = await supabase.from('document_templates').select('*').eq('is_active', true).order('template_name');
      if (error) throw error;
      return data || [];
    },
    getById: async (id) => {
      const { data, error } = await supabase.from('document_templates').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    create: async (templateData) => {
      const { data, error } = await supabase.from('document_templates').insert(templateData).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('document_templates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from('document_templates').delete().eq('id', id);
      if (error) throw error;
    }
  },
  // Requests
  requests: {
    getAll: async () => {
      const { data, error } = await supabase.from('document_requests').select(`*, resident:residents(*), template:document_templates(*)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getByStatus: async (status) => {
      const { data, error } = await supabase.from('document_requests').select(`*, resident:residents(*), template:document_templates(*)`).eq('status', status).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getById: async (id) => {
      const { data, error } = await supabase.from('document_requests').select(`*, resident:residents(*), template:document_templates(*)`).eq('id', id).single();
      if (error) throw error;
      return data;
    },
    create: async (requestData) => {
      const { data, error } = await supabase.from('document_requests').insert(requestData).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('document_requests').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    updateStatus: async (id, status, userId, additionalData = {}) => {
      const updates = { status, ...additionalData, updated_at: new Date().toISOString() };
      if (status === 'processing') { updates.processed_by = userId; updates.processed_at = new Date().toISOString(); }
      else if (status === 'released') { updates.released_by = userId; updates.released_at = new Date().toISOString(); }
      const { data, error } = await supabase.from('document_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
  },
  // Settings
  settings: {
    getAll: async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      return data || [];
    },
    getByKey: async (key) => {
      const { data, error } = await supabase.from('system_settings').select('*').eq('setting_key', key).single();
      if (error) throw error;
      return data;
    },
    set: async (key, value, userId) => {
      const { data, error } = await supabase.from('system_settings').upsert({ setting_key: key, setting_value: value, updated_by: userId, updated_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      return data;
    }
  },
  // Logs
  logs: {
    create: async (logData) => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .insert({ ...logData, created_at: new Date().toISOString() });
        
        if (error) {
          console.error('Audit log error:', error);
          return null;
        }
        return data;
      } catch (err) {
        console.error('Audit log exception:', err);
        return null;
      }
    },
    getRecent: async (limit = 100) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }
  }
};

export default supabase;