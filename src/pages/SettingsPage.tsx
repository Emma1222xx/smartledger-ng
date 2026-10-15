import { useState } from 'react';
import { Building2, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function SettingsPage() {
  const { business, user, refreshBusiness } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: business?.name ?? '',
    phone: business?.phone ?? '',
    address: business?.address ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    if (!business) return;
    const trimmed = formData.name.trim();
    if (!trimmed) { setError('Business name is required.'); return; }
    if (trimmed.length > 120) { setError('Name must be under 120 characters.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: trimmed,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      })
      .eq('id', business.id);

    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSuccess('Settings saved successfully.');
    setEditing(false);
    await refreshBusiness();
  };

  if (!business || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Business profile */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 size={16} /> Business profile
          </h2>
          {!editing && (
            <button
              onClick={() => {
                setEditing(true);
                setFormData({
                  name: business.name,
                  phone: business.phone ?? '',
                  address: business.address ?? '',
                });
              }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="label">Business name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Phone number</label>
              <input
                type="tel"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08012345678"
              />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea
                className="input"
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Shop address"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-gray-900 font-medium">{business.name}</p>
            </div>
            {business.phone && (
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-gray-900">{business.phone}</p>
              </div>
            )}
            {business.address && (
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-gray-900">{business.address}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account info */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <User size={16} /> Account
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Account created</p>
            <p className="text-gray-900">{new Date(user.created_at).toLocaleDateString('en-NG')}</p>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
        <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <p className="font-semibold mb-1">Data privacy reminder</p>
          <p>
            Your business data is stored securely and protected by row-level security. Never share your
            password or account credentials. To change your password, sign out and use the "Forgot password"
            link on the sign-in page.
          </p>
        </div>
      </div>

      {/* App info */}
      <div className="text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-700">SmartLedger NG</p>
        <p className="mt-1">Version 1.0.0 • Built for Nigerian businesses</p>
      </div>
    </div>
  );
}
