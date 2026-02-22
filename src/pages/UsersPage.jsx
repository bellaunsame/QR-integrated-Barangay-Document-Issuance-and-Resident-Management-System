import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { 
  Users, Plus, Edit2, Trash2, Shield, X, Save, 
  UserCheck, UserX, Lock, AlertCircle 
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());
  
  // Security State
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));

    // Real-time Password Strength Check
    if (name === 'password' && value) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Validation Rules
    const validationRules = {
      email: { required: true, type: 'email' },
      full_name: { required: true, type: 'name', minLength: 2 },
      role: { required: true },
      // Only require password if creating a NEW user
      password: { required: !editingUser, minLength: 8 }
    };

    // 2. Form Validation & Sanitization
    const validation = validateForm(formData, validationRules);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setLoading(false);
      return;
    }

    // 3. Detailed Password Strength Check (if password provided)
    if (formData.password) {
      const pwCheck = validatePasswordStrength(formData.password);
      if (!pwCheck.isValid) {
        setErrors(prev => ({ ...prev, password: pwCheck.errors }));
        setLoading(false);
        return;
      }
    }

    try {
      let finalUserData = { ...validation.sanitizedData };
      
      // 4. Password Hashing (if applicable)
      if (formData.password) {
        const hashedPassword = await hashPassword(formData.password);
        finalUserData.password_hash = hashedPassword;
      }
      // Clean up the plain-text password from the payload
      delete finalUserData.password;

      let savedUser;
      if (editingUser) {
        savedUser = await db.users.update(editingUser.id, finalUserData);
        
        await logDataModification(
          currentUser.id, 'users', editingUser.id,
          ACTIONS.USER_UPDATED, editingUser, finalUserData
        );
        toast.success('User updated successfully');
      } else {
        savedUser = await db.users.create(finalUserData);
        
        await logDataModification(
          currentUser.id, 'users', savedUser.id,
          ACTIONS.USER_CREATED, null, finalUserData
        );
        toast.success('User created successfully');
      }

      await loadUsers();
      closeModal();
    } catch (error) {
      console.error('Save user error:', error);
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

  const handleToggleActive = async (user) => {
    try {
      await db.users.update(user.id, { is_active: !user.is_active });
      
      await logDataModification(
        currentUser.id, 'users', user.id,
        ACTIONS.USER_UPDATED, 
        { is_active: user.is_active },
        { is_active: !user.is_active }
      );
      
      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'}`);
      await loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await db.users.delete(userId);
      
      await logDataModification(
        currentUser.id, 'users', userId,
        'user_deleted', null, null
      );
      
      toast.success('User deleted successfully');
      await loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(getEmptyFormData());
    setErrors({});
    setPasswordStrength(null);
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'admin': return 'badge-admin';
      case 'clerk': return 'badge-clerk';
      case 'record_keeper': return 'badge-keeper';
      default: return 'badge-default';
    }
  };

  const formatRole = (role) => {
    const roleMap = {
      'admin': 'Administrator',
      'clerk': 'Barangay Clerk',
      'record_keeper': 'Record Keeper'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="users-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Users size={32} />
          <div>
            <h1>User Management</h1>
            <p>Manage system users and their permissions</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading && users.length === 0 ? (
          <div className="loading-state">
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No Users Found</h3>
            <p>Click "Add User" to create your first user account</p>
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
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
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
                        {user.is_active ? (
                          <><UserCheck size={14} /> Active</>
                        ) : (
                          <><UserX size={14} /> Inactive</>
                        )}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon btn-edit" 
                          onClick={() => handleEdit(user)}
                          title="Edit user"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className={`btn-icon ${user.is_active ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleToggleActive(user)}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDelete(user.id)}
                          title="Delete user"
                          disabled={currentUser.id === user.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className={errors.full_name ? 'input-error' : ''}
                  />
                  {errors.full_name && <span className="error-text">{errors.full_name[0]}</span>}
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'input-error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email[0]}</span>}
                </div>

                <div className="form-group">
                  <label>
                    Password {editingUser && '(Leave blank to keep current)'}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={errors.password ? 'input-error' : ''}
                    />
                    <Lock size={16} className="input-icon" />
                  </div>
                  
                  {/* Strength Indicator */}
                  {passwordStrength && (
                    <div className="password-strength-container">
                      <div 
                        className="strength-bar" 
                        style={{ 
                          width: `${(passwordStrength.score / 9) * 100}%`,
                          backgroundColor: passwordStrength.color 
                        }} 
                      />
                      <small style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </small>
                    </div>
                  )}
                  {errors.password && <span className="error-text">{errors.password[0]}</span>}
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select 
                    name="role" 
                    value={formData.role} 
                    onChange={handleInputChange}
                    className={errors.role ? 'input-error' : ''}
                  >
                    <option value="">Select role</option>
                    <option value="admin">Administrator</option>
                    <option value="clerk">Barangay Clerk</option>
                    <option value="record_keeper">Record Keeper</option>
                  </select>
                  {errors.role && <span className="error-text">{errors.role[0]}</span>}
                </div>

                <div className="form-group checkbox-group">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="is_active">Active Account</label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : <><Save size={18} /> Save User</>}
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