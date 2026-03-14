import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, db } from '../services/supabaseClient'; 
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser'; 
import { 
  Users, Plus, Edit2, Shield, X, Save, 
  UserCheck, UserX, Lock, CheckCircle, XCircle, Copy, RefreshCw
} from 'lucide-react';

// Security Services
import { 
  validatePasswordStrength, 
  hashPassword 
} from '../services/security/passwordService';
import { validateForm } from '../services/security/inputSanitizer';
import { logDataModification, ACTIONS } from '../services/security/auditLogger';

import './UsersPage.css';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // UI Filter State
  const [filterStatus, setFilterStatus] = useState('all');

  // Security State
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [errors, setErrors] = useState({});
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [formData, setFormData] = useState(getEmptyFormData());

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filterStatus]);

  function getEmptyFormData() {
    return {
      email: '',
      password: '',
      full_name: '',
      role: '',
      is_active: true
    };
  }

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await db.users.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...users];
    if (filterStatus === 'active') result = result.filter(u => u.is_active);
    if (filterStatus === 'inactive') result = result.filter(u => !u.is_active);
    setFilteredUsers(result);
  };

  // --- AUTO-PASSWORD GENERATOR ---
  const generateSecurePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let newPassword = '';
    for (let i = 0; i < 10; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(newPassword);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast.success('Temporary password copied to clipboard!');
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData(getEmptyFormData());
    setErrors({});
    setPasswordStrength(null);
    generateSecurePassword(); // Auto-generate on open
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));

    if (name === 'password' && value && editingUser) {
      const validation = validatePasswordStrength(value);
      setPasswordStrength(validation.strength);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, password: validation.errors }));
      } else {
        const { password, ...rest } = errors;
        setErrors(rest);
      }
    } else if (name === 'password' && !value) {
      setPasswordStrength(null);
    }
  };

  const handleToggleStatus = async (selectedUser) => {
    if (selectedUser.id === currentUser.id) {
      toast.error("You cannot deactivate your own account.");
      return;
    }

    const newStatus = !selectedUser.is_active;
    const actionText = newStatus ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${actionText} ${selectedUser.full_name}?`)) return;

    try {
      setLoading(true);
      await db.users.update(selectedUser.id, { is_active: newStatus });

      await logDataModification(
        currentUser.id,
        'users',
        selectedUser.id,
        newStatus ? ACTIONS.USER_REACTIVATED : ACTIONS.USER_DEACTIVATED,
        { is_active: !newStatus },
        { is_active: newStatus }
      );

      toast.success(`User ${actionText}d successfully`);
      await loadUsers();
    } catch (error) {
      toast.error(`Failed to ${actionText} user`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentUser?.role !== 'admin') {
      toast.error('Unauthorized: Only Administrators can modify user accounts.');
      return;
    }

    setLoading(true);

    const validationRules = {
      email: { required: true, type: 'email' },
      full_name: { required: true, type: 'name', minLength: 2 },
      role: { required: true },
      password: { required: false } 
    };

    const validation = validateForm(formData, validationRules);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setLoading(false);
      return;
    }

    const emailVal = formData.email.toLowerCase();
    if (!emailVal.endsWith('@gmail.com')) {
      setErrors({ ...validation.errors, email: ['Only @gmail.com addresses are allowed for staff.'] });
      setLoading(false);
      return;
    }

    try {
      let finalUserData = { ...validation.sanitizedData };

      if (editingUser) {
        if (formData.password) {
          finalUserData.password_hash = await hashPassword(formData.password);
        }
        delete finalUserData.password;

        await db.users.update(editingUser.id, finalUserData);
        await logDataModification(currentUser.id, 'users', editingUser.id, ACTIONS.USER_UPDATED, editingUser, finalUserData);
        toast.success('User updated successfully');
      } else {
        const activePassword = generatedPassword;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailVal,
          password: activePassword,
        });

        if (authError) throw authError;

        finalUserData.password_hash = await hashPassword(activePassword);
        finalUserData.id = authData.user.id; 
        finalUserData.is_verified = true; 
        finalUserData.needs_password_change = true; 
        delete finalUserData.password;

        await db.users.create(finalUserData);
        
        await emailjs.send(
          'service_178ko1n', 
          'template_qzkqkvf', 
          { 
            to_email: formData.email, 
            to_name: formData.full_name, 
            otp_code: activePassword, 
            email_subject_message: "An official barangay account has been provisioned for you. Please use this temporary password to log in. You will be forced to change it immediately.",
            barangay_name: "Dos Tibag" 
          }, 
          'pfTdQReY0nVV3CjnY'
        );
        
        await logDataModification(currentUser.id, 'users', finalUserData.id, ACTIONS.USER_CREATED, null, finalUserData);
        toast.success('Staff provisioned! Temporary password sent to their email.');
      }

      await loadUsers();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      role: user.role || '',
      is_active: user.is_active !== false
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(getEmptyFormData());
    setGeneratedPassword('');
    setErrors({});
    setPasswordStrength(null);
  };

  // --- UPDATED ROLE FORMATTING ---
  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'admin': return 'badge-admin';
      case 'barangay_captain': return 'badge-view-only'; // Make Captain look like view-only
      case 'secretary': return 'badge-warning'; 
      case 'clerk': return 'badge-clerk';
      case 'record_keeper': return 'badge-keeper';
      case 'barangay_investigator': return 'badge-danger'; 
      case 'view_only': return 'badge-view-only'; 
      default: return 'badge-default';
    }
  };

  const formatRole = (role) => {
    const roleMap = { 
      'admin': 'Administrator', 
      'barangay_captain': 'Barangay Captain (View Only)', // Explicit label
      'secretary': 'Barangay Secretary',  
      'clerk': 'Barangay Clerk', 
      'record_keeper': 'Record Keeper',
      'barangay_investigator': 'Barangay Investigator',
      'view_only': 'View Only Staff' 
    };
    return roleMap[role] || role;
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="header-left">
          <Users size={32} />
          <div>
            <h1>Staff Management</h1>
            <p>Provision and manage barangay official accounts</p>
          </div>
        </div>
        
        <div className="header-right" style={{ display: 'flex', gap: '10px' }}>
          <select 
            className="filter-select" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>

          {currentUser?.role === 'admin' && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={20} /> Add Staff
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading && users.length === 0 ? (
          <div className="loading-state"><p>Loading users...</p></div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No Staff Found</h3>
            <p>Try changing your filter or add a new staff member</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className={!user.is_active ? 'row-deactivated' : ''}>
                    <td>
                      <div className="user-info">
                        <Shield size={16} className="user-icon" />
                        <strong>{user.full_name || 'N/A'}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                        {user.is_active ? <><UserCheck size={14} /> Active</> : <><UserX size={14} /> Deactivated</>}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {currentUser?.role === 'admin' ? (
                          <>
                            <button className="btn-icon btn-edit" onClick={() => handleEdit(user)} title="Edit user"><Edit2 size={16} /></button>
                            <button 
                              className={`btn-icon ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleStatus(user)}
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                              disabled={currentUser.id === user.id}
                            >
                              {user.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                          </>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>Read-Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit Staff User' : 'Provision Staff Account'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} required />
                  {errors.full_name && <span className="error-text">{errors.full_name[0]}</span>}
                </div>

                <div className="form-group">
                  <label>Email Address (@gmail.com) *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={editingUser} required />
                  {errors.email && <span className="error-text">{errors.email[0]}</span>}
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="">Select role</option>
                    <option value="admin">Administrator</option>
                    <option value="barangay_captain">Barangay Captain (View Only)</option>
                    <option value="secretary">Barangay Secretary</option> 
                    <option value="clerk">Barangay Clerk</option>
                    <option value="record_keeper">Record Keeper</option>
                    <option value="barangay_investigator">Barangay Investigator (Blotter)</option>
                    <option value="view_only">Regular View Only</option>
                  </select>
                </div>

                {!editingUser ? (
                  <div className="form-group">
                    <label>Temporary Password *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={generatedPassword} 
                        readOnly 
                        style={{ flex: 1, backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 'bold', letterSpacing: '1px' }} 
                      />
                      <button type="button" onClick={generateSecurePassword} title="Generate new" style={{ padding: '0 10px', cursor: 'pointer', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                        <RefreshCw size={16} />
                      </button>
                      <button type="button" onClick={copyToClipboard} title="Copy to clipboard" style={{ padding: '0 10px', cursor: 'pointer', background: 'var(--primary-600)', color: 'white', border: 'none', borderRadius: '4px' }}>
                        <Copy size={16} />
                      </button>
                    </div>
                    <small style={{ color: '#b91c1c', marginTop: '4px', display: 'block' }}>User will be forced to change this upon their first login.</small>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Reset Password (Leave blank to keep current)</label>
                    <div className="password-input-wrapper">
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} />
                      <Lock size={16} className="input-icon" />
                    </div>
                    {passwordStrength && (
                      <div className="password-strength-container">
                        <div className="strength-bar" style={{ width: `${(passwordStrength.score / 9) * 100}%`, backgroundColor: passwordStrength.color }} />
                        <small style={{ color: passwordStrength.color }}>{passwordStrength.label}</small>
                      </div>
                    )}
                    {errors.password && <span className="error-text">{errors.password[0]}</span>}
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : <><Save size={18} /> {editingUser ? 'Update User' : 'Create Account'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;