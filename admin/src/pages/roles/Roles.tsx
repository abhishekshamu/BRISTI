import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Users } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
}

const allPermissions = [
  'products.read', 'products.write', 'products.delete',
  'orders.read', 'orders.write', 'orders.delete',
  'categories.read', 'categories.write', 'categories.delete',
  'collections.read', 'collections.write', 'collections.delete',
  'coupons.read', 'coupons.write', 'coupons.delete',
  'pages.read', 'pages.write', 'pages.delete',
  'blogs.read', 'blogs.write', 'blogs.delete',
  'media.read', 'media.write', 'media.delete',
  'settings.read', 'settings.write',
  'users.read', 'users.write', 'users.delete',
  'roles.read', 'roles.write', 'roles.delete',
  'audit.read',
  'analytics.read',
  'theme.write',
  'inventory.read', 'inventory.write',
];

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole._id}`, formData);
        toast.success('Role updated successfully');
      } else {
        await api.post('/roles', { ...formData, password: 'changeme123' });
        toast.success('Role created successfully');
      }
      setShowModal(false);
      setEditingRole(null);
      setFormData({ name: '', description: '', permissions: [] });
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save role');
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: [...role.permissions],
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await api.delete(`/roles/${id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const togglePermission = (permission: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(permission)
        ? formData.permissions.filter(p => p !== permission)
        : [...formData.permissions, permission]
    });
  };

  const getPermissionGroup = (permission: string) => {
    return permission.split('.')[0];
  };

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    const group = getPermissionGroup(perm);
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Roles & Permissions</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage admin roles and access control</p>
        </div>
        <button
          onClick={() => {
            setEditingRole(null);
            setFormData({ name: '', description: '', permissions: [] });
            setShowModal(true);
          }}
          className="admin-btn-primary py-2.5 px-4 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Role
        </button>
      </div>

      {/* Roles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          roles.map((role) => (
            <div key={role._id} className="admin-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Shield className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{role.name}</h3>
                    {role.isSystem && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">System Role</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(role)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                  >
                    <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDelete(role._id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>

              {role.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{role.description}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                  <Users className="w-4 h-4 mr-1" />
                  {role.userCount} users
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {role.permissions.length} permissions
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="admin-label">Role Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="e.g. editor, manager"
                  required
                />
              </div>
              <div>
                <label className="admin-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="admin-input mt-1"
                  placeholder="Role description"
                />
              </div>
              <div>
                <label className="admin-label mb-4">Permissions</label>
                <div className="space-y-4 max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group} className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{group}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {perms.map((perm) => (
                          <label key={perm} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(perm)}
                              onChange={() => togglePermission(perm)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{perm.split('.')[1]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="admin-btn-secondary py-2.5 px-4"
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary py-2.5 px-4">
                  {editingRole ? 'Update' : 'Create'} Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}