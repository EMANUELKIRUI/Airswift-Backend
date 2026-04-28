import React, { useState, useEffect } from 'react';
import api from '../api';
import { getSocket } from '../socket';
import EditModal from './EditModal';
import '../styles/AdminUsers.css'; // You'll need to create this CSS file

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  
  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, verifiedFilter]);

  // 🔴 Real-time Socket.IO listening for user updates
  useEffect(() => {
    const socket = getSocket();
    
    if (!socket) {
      console.warn('Socket.IO is not connected');
      return;
    }

    // Listen for user updates
    const handleUserUpdated = (data) => {
      console.log('📡 User updated via socket:', data);
      
      if (data.user && data.userId) {
        setUsers(prevUsers =>
          prevUsers.map(u => u._id === data.userId ? data.user : u)
        );
      }
    };

    // Listen for user deletions
    const handleUserDeleted = (data) => {
      console.log('📡 User deleted via socket:', data);
      
      if (data.userId) {
        setUsers(prevUsers => prevUsers.filter(u => u._id !== data.userId));
      }
    };

    socket.on('userUpdated', handleUserUpdated);
    socket.on('userDeleted', handleUserDeleted);

    // Cleanup listeners on unmount
    return () => {
      socket.off('userUpdated', handleUserUpdated);
      socket.off('userDeleted', handleUserDeleted);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📥 Fetching all users from /api/admin/users');
      
      const response = await api.get('/admin/users');
      console.log('✅ Users fetched successfully:', response.data);
      
      setUsers(response.data.data || []);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch users';
      setError(errorMessage);
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        setError('Unauthorized - Please login again');
      } else if (err.response?.status === 403) {
        setError('Forbidden - You do not have permission to view users');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users.filter((user) => {
      // Search filter
      const matchesSearch = !searchTerm || 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Verified filter
      const matchesVerified = verifiedFilter === 'all' || 
        (verifiedFilter === 'verified' ? user.isVerified : !user.isVerified);

      return matchesSearch && matchesRole && matchesVerified;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleRefresh = () => {
    fetchUsers();
  };

  const handleAddUser = () => {
    setEditingUser({
      name: '',
      email: '',
      phone: '',
      location: '',
      role: 'user',
      isVerified: false,
      bio: ''
    });
    setIsCreateMode(true);
    setIsEditModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsCreateMode(false);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (updatedData) => {
    try {
      setIsSaving(true);
      console.log('💾 Saving user changes:', updatedData);

      let response;
      if (isCreateMode) {
        response = await api.post('/admin/users', updatedData);
      } else {
        response = await api.put(`/admin/users/${editingUser._id}`, updatedData);
      }

      const savedUser = response.data.user || response.data.data || response.data;

      if (isCreateMode) {
        setUsers(prev => [savedUser, ...prev]);
        alert('✅ User created successfully!');
      } else {
        const updatedUsers = users.map(u => 
          u._id === editingUser._id ? { ...u, ...updatedData, ...savedUser, lastModifiedAt: new Date() } : u
        );
        setUsers(updatedUsers);
        setSaveStatus(prev => ({
          ...prev,
          [editingUser._id]: new Date()
        }));
        alert('✅ User updated successfully!');
      }

      setIsEditModalOpen(false);
      setEditingUser(null);
      setIsCreateMode(false);
    } catch (err) {
      console.error('❌ Error saving user:', err);
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const confirmDelete = window.confirm(
        'Are you sure you want to delete this user? This action cannot be undone.'
      );
      
      if (!confirmDelete) return;

      console.log('🗑️ Deleting user:', userId);
      await api.delete(`/admin/users/${userId}`);
      
      // Update local state
      setUsers(users.filter(u => u._id !== userId));
      setDeleteConfirm(null);
      
      // Show success notification
      alert('✅ User deleted successfully!');
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const getEditFields = () => {
    if (!editingUser) return [];
    
    return [
      { name: 'name', label: 'Name', type: 'text', value: editingUser.name, required: true },
      { name: 'email', label: 'Email', type: 'email', value: editingUser.email, required: true },
      { name: 'phone', label: 'Phone', type: 'text', value: editingUser.phone || '' },
      { name: 'location', label: 'Location', type: 'text', value: editingUser.location || '' },
      { name: 'role', label: 'Role', type: 'select', value: editingUser.role || 'user', options: [
        { label: 'User', value: 'user' },
        { label: 'Recruiter', value: 'recruiter' },
        { label: 'Admin', value: 'admin' }
      ]},
      { name: 'isVerified', label: 'Verified', type: 'checkbox', value: editingUser.isVerified },
      { name: 'bio', label: 'Bio', type: 'textarea', value: editingUser.bio || '', rows: 3 }
    ];
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Role', 'Verified', 'Created Date'],
      ...(Array.isArray(filteredUsers) ? filteredUsers : []).map(user => [
        user._id,
        user.name,
        user.email,
        user.role,
        user.isVerified ? 'Yes' : 'No',
        new Date(user.createdAt).toLocaleString()
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading) {
    return (
      <div className="admin-users-container loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-users-container error">
        <div className="error-card">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users-container">
      <div className="admin-header">
        <h1>User Management</h1>
        <p className="subtitle">Total Users: {filteredUsers.length}</p>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="recruiter">Recruiter</option>
          </select>

          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Verification Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        <div className="action-buttons">
          <button onClick={handleAddUser} className="btn-create" title="Add new user">
            ➕ Add User
          </button>
          <button onClick={handleRefresh} className="btn-refresh" title="Refresh users">
            🔄 Refresh
          </button>
          <button onClick={handleExportCSV} className="btn-export" title="Export to CSV">
            📥 Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-section">
        <div className="stat-card">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{users.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Admins</span>
          <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verified</span>
          <span className="stat-value">{users.filter(u => u.isVerified).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Filtered Results</span>
          <span className="stat-value">{filteredUsers.length}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-section">
        {currentUsers.length === 0 ? (
          <div className="no-results">
            <p>No users found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Joined</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(currentUsers) ? currentUsers : []).map((user) => (
                    <tr key={user._id} className={`user-row role-${user.role}`}>
                      <td className="name-cell">
                        <span className="user-name">{user.name || 'N/A'}</span>
                      </td>
                      <td className="email-cell">{user.email}</td>
                      <td className="role-cell">
                        <span className={`role-badge role-${user.role}`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="verified-cell">
                        <span className={`badge badge-${user.isVerified ? 'verified' : 'unverified'}`}>
                          {user.isVerified ? '✓ Yes' : '✗ No'}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="date-cell">
                        <div className="date-with-save">
                          <span>{new Date(user.updatedAt).toLocaleDateString()}</span>
                          {saveStatus[user._id] && (
                            <span className="last-saved-time" title={new Date(saveStatus[user._id]).toLocaleString()}>
                              💾 {new Date(saveStatus[user._id]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons-inline">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => handleEditUser(user)}
                            title="Edit user"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => handleDeleteUser(user._id)}
                            title="Delete user"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn-pagination"
                >
                  ← Previous
                </button>
                <div className="page-info">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-pagination"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        title={isCreateMode ? 'Add User' : 'Edit User'}
        fields={getEditFields()}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          setIsCreateMode(false);
        }}
        onSave={handleSaveUser}
        loading={isSaving}
        lastSaved={!isCreateMode && editingUser?._id ? saveStatus[editingUser._id] : null}
      />
    </div>
  );
}

export default AdminUsers;
