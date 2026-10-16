import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function SetupPage() {
  const { user, refreshBusiness } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) { setError('Shop name is required.'); return; }
    if (trimmedName.length > 120) { setError('Shop name must be under 120 characters.'); return; }

    setLoading(true);

    const { data, error: setupError } = await supabase
      .from('businesses')
      .insert({
        name: trimmedName,
        phone: phone.trim() || null,
        address: address.trim() || null,
      })
      .select()
      .single();

    if (setupError) { setError(setupError.message); setLoading(false); return; }

    const business = data;

    const { error: memError } = await supabase.from('memberships').insert({
      business_id: business.id,
      user_id: user.id,
      role: 'owner',
    });

    setLoading(false);
    if (memError) { setError(memError.message); return; }

    await refreshBusiness();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">SL</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your shop</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tell us about your business to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="label">Shop / business name <span className="text-red-500">*</span></label>
            <input
              id="name"
              type="text"
              required
              maxLength={120}
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grace Provision Store"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="phone" className="label">Phone number (optional)</label>
            <input
              id="phone"
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
            />
          </div>

          <div>
            <label htmlFor="address" className="label">Address (optional)</label>
            <textarea
              id="address"
              className="input"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop address"
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create shop'}
          </button>
        </form>
      </div>
    </div>
  );
}
