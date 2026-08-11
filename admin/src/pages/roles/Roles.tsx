import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Shield, ShieldCheck, Users, KeyRound } from 'lucide-react';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/auth-context';
import { ADMIN_ROLES, ROLE_PERMISSIONS } from '@shared/constants';
import PageShell from '../../components/ui/PageShell';
import IconBtn from '../../components/ui/IconBtn';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import PageSpinner from '../../components/ui/PageSpinner';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface StaffMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

const ROLE_META: Record<string, { description: string; tone?: string }> = {
  super_admin: { description: 'Full access. Every resource, every setting, including permission and staff management.', tone: 'purple' },
  admin: { description: 'Manages products, orders, content, media and store settings.', tone: 'blue' },
  moderator: { description: 'Read-only view across the store plus order/user/review management.', tone: 'green' },
  content_editor: { description: 'Creates and edits blogs and pages, with full media library access.', tone: 'amber' },
  support: { description: 'Handles customer orders, users and review moderation.', tone: 'slate' },
};

const allPermissions = [
  'products:read', 'products:create', 'products:update', 'products:delete',
  'categories:read', 'categories:create', 'categories:update', 'categories:delete',
  'collections:read', 'collections:create', 'collections:update', 'collections:delete',
  'orders:read', 'orders:create', 'orders:update', 'orders:delete',
  'users:read', 'users:create', 'users:update', 'users:delete',
  'coupons:read', 'coupons:create', 'coupons:update', 'coupons:delete',
  'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
  'pages:read', 'pages:create', 'pages:update', 'pages:delete',
  'reviews:read', 'reviews:update', 'reviews:delete',
  'media:read', 'media:create', 'media:delete',
  'settings:read', 'settings:update',
  'analytics:read',
];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'admin',
  isActive: true,
  permissions: [] as string[],
};

export default function Roles() {
  const { admin: currentAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const limit = 100;
      const response = await api.get(`/roles?limit=${limit}`);
      setStaff(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const canAssign = (role: string) => role !== 'super_admin' || currentAdmin?.role === 'super_admin';
  const isSelf = (member: StaffMember) => currentAdmin?._id === member._id;

  const stats = useMemo(() => {
    const active = staff.filter((m) => m.isActive).length;
    const superAdmins = staff.filter((m) => m.role === 'super_admin').length;
    return { total: staff.length, active, superAdmins };
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/roles/${editing._id}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          isActive: formData.isActive,
          ...(formData.permissions.length ? { permissions: formData.permissions } : {}),
        });
        toast.success('Staff member updated successfully');
      } else {
        if (!formData.email || !formData.password) {
          toast.error('Email and password are required to invite staff');
          return;
        }
        await api.post('/roles', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          ...(formData.permissions.length ? { permissions: formData.permissions } : {}),
        });
        toast.success('Staff member invited successfully');
      }
      setShowModal(false);
      setEditing(null);
      setFormData({ ...emptyForm });
      fetchStaff();
    } catch (error: any) {
      toast.error(getApiError(error, 'Failed to save staff member'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditing(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      password: '',
      role: member.role,
      isActive: member.isActive,
      permissions: [...member.permissions],
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...emptyForm, permissions: [...ROLE_PERMISSIONS.ADMIN] });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/roles/${deleteTarget._id}`);
      toast.success('Staff member removed');
      setDeleteTarget(null);
      fetchStaff();
    } catch (error: any) {
      toast.error(getApiError(error, 'Failed to remove staff member'));
    }
  };

  const togglePermission = (permission: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(permission)
        ? formData.permissions.filter((p) => p !== permission)
        : [...formData.permissions, permission],
    });
  };

  const setRoleWithDefaults = (role: string) => {
    const defaults = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    setFormData({
      ...formData,
      role,
      permissions: defaults.includes('*') ? [...allPermissions] : [...defaults],
    });
  };

  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce((acc, perm) => {
      const group = perm.split(':')[0];
      if (!acc[group]) acc[group] = [];
      acc[group].push(perm);
      return acc;
    }, {} as Record<string, string[]>);
  }, []);

  const permissionSummary = (perms: string[]) => {
    if (perms.length === 0) return 'No permissions';
    return perms.length === 1 ? '1 permission' : `${perms.length} permissions`;
  };

  const initials = (member: StaffMember) =>
    `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <PageShell
      title="Staff & Permissions"
      subtitle="Invite team members, assign roles and control access"
      actions={
        <button
          onClick={openCreate}
          className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Invite Staff
        </button>
      }
    >
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="admin-card p-5 flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Users className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total staff</p>
              </div>
            </div>
            <div className="admin-card p-5 flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.active}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active accounts</p>
              </div>
            </div>
            <div className="admin-card p-5 flex items-center gap-4">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                <KeyRound className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.superAdmins}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Super admins</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Roles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {ADMIN_ROLES.map((role) => {
                const meta = ROLE_META[role.value] || { description: '' };
                const perms = ROLE_PERMISSIONS[role.value as keyof typeof ROLE_PERMISSIONS] || [];
                return (
                  <div key={role.value} className="admin-card p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">
                        {role.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                      {meta.description}
                    </p>
                    <Badge tone={meta.tone as any} className="mt-3 w-fit">
                      {perms.includes('*') ? 'All permissions' : `${perms.length} permissions`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Staff members <span className="text-slate-400 font-normal">· {staff.length}</span>
            </h3>
            {staff.length === 0 ? (
              <EmptyState
                title="No staff members yet"
                body="Invite your first teammate to start assigning roles."
                icon={<Shield className="w-6 h-6" />}
                action={
                  <button
                    onClick={openCreate}
                    className="admin-btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Invite Staff
                  </button>
                }
              />
            ) : (
              <div className="admin-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Access</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Last login</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staff.map((member) => (
                      <tr key={member._id} className={member.isActive ? '' : 'opacity-60'}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold shrink-0">
                              {initials(member)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                {member.firstName} {member.lastName}
                                {isSelf(member) && (
                                  <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={ROLE_META[member.role]?.tone as any}>{member.role.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5" />
                            {permissionSummary(member.permissions)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={member.isActive ? 'green' : 'red'}>{member.isActive ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                          {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <IconBtn title="Edit" onClick={() => handleEdit(member)}>
                              <Edit className="w-4 h-4" />
                            </IconBtn>
                            {!isSelf(member) && (
                              <IconBtn title="Remove" onClick={() => setDeleteTarget(member)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </IconBtn>
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
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { if (!saving) setShowModal(false); }}
        title={editing ? 'Edit staff member' : 'Invite staff'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="admin-input mt-1"
                placeholder="Jane"
                required
              />
            </div>
            <div>
              <label className="admin-label">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="admin-input mt-1"
                placeholder="Doe"
                required
              />
            </div>
            <div>
              <label className="admin-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="admin-input mt-1"
                placeholder="admin@example.com"
                required
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="admin-label">{editing ? 'New password (optional)' : 'Password'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="admin-input mt-1"
                placeholder={editing ? 'Leave blank to keep current password' : 'Min. 8 characters'}
                minLength={8}
                required={!editing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setRoleWithDefaults(e.target.value)}
                className="admin-input mt-1"
                disabled={!!editing && isSelf({ _id: editing._id } as StaffMember)}
              >
                {ADMIN_ROLES.filter((r) => canAssign(r.value)).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {formData.role !== 'super_admin' && currentAdmin?.role !== 'super_admin' && (
                <p className="text-xs text-slate-400 mt-1">
                  Only a super admin can assign the super admin role.
                </p>
              )}
            </div>
            {editing && (
              <div>
                <label className="admin-label">Account status</label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    disabled={isSelf(editing)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formData.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="admin-label mb-0">Permissions</label>
              {currentAdmin?.role !== 'super_admin' && (
                <span className="text-xs text-slate-400">Role defaults are applied unless changed by a super admin.</span>
              )}
            </div>
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
                          className="admin-checkbox"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400 text-capitalize">{perm.split(':')[1]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="admin-btn-secondary h-9 px-4 text-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary h-9 px-4 text-sm" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Invite staff'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove staff member"
        body={`Remove ${deleteTarget?.firstName || ''} ${deleteTarget?.lastName || ''} from the admin panel? They will lose access immediately.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}