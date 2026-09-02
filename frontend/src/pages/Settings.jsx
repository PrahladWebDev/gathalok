import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, Link } from 'react-router-dom';
import { getMe } from '../store/slices/authSlice';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const fileRef = useRef();

  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    email: user?.email || '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  if (!user) return <Navigate to="/" />;

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePwd = e => setPasswords(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.post('/upload/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.patch('/auth/me', { avatar: res.data.data });
      dispatch(getMe());
      toast.success('Avatar updated!');
    } catch { toast.error('Upload failed.'); }
    setUploading(false);
  };

  const handleProfileSave = async () => {
    if (!form.name.trim() || !form.username.trim()) { toast.error('Name and username are required.'); return; }
    setSaving(true);
    try {
      await api.patch('/auth/me', {
        name: form.name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim(),
      });
      dispatch(getMe());
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
    setSaving(false);
  };

  const handlePasswordSave = async () => {
    if (!passwords.current || !passwords.next) { toast.error('Fill in all password fields.'); return; }
    if (passwords.next !== passwords.confirm) { toast.error('New passwords do not match.'); return; }
    if (passwords.next.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setSaving(true);
    try {
      await api.patch('/auth/password', { currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password changed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed.');
    }
    setSaving(false);
  };

  return (
    <div className="settings">
      <div className="settings__header">
        <div className="container">
          <Link to="/profile" className="settings__back">← Back to Profile</Link>
          <h1 className="settings__title">Account Settings</h1>
        </div>
      </div>

      <div className="container settings__body">
        <nav className="settings__tabs">
          {[
            { id: 'profile', label: '👤 Profile' },
            { id: 'security', label: '🔒 Security' },
          ].map(t => (
            <button
              key={t.id}
              className={`settings__tab ${tab === t.id ? 'settings__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </nav>

        {tab === 'profile' && (
          <div className="settings__panel">
            {/* Avatar */}
            <div className="settings__section">
              <h3 className="settings__section-title">Profile Photo</h3>
              <div className="settings__avatar-row">
                <div className="settings__avatar">
                  {user.avatar?.url
                    ? <img src={user.avatar.url} alt={user.name} />
                    : <div className="settings__avatar-fallback">{user.name[0].toUpperCase()}</div>
                  }
                </div>
                <div className="settings__avatar-info">
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : '📷 Change Photo'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                  <p className="settings__hint">JPG, PNG or WebP · Max 5 MB</p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="settings__section">
              <h3 className="settings__section-title">Basic Info</h3>

              <div className="settings__form-grid">
                <div className="form-group">
                  <label className="form-label">Display Name *</label>
                  <input className="form-input" name="name" value={form.name} onChange={handle}
                    placeholder="Your name" maxLength={60} />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <div className="settings__input-prefix-wrap">
                    <span className="settings__input-prefix">@</span>
                    <input className="form-input settings__input-prefixed" name="username" value={form.username}
                      onChange={handle} placeholder="username" maxLength={30}
                      pattern="[a-zA-Z0-9_]+" />
                  </div>
                  <p className="settings__hint">Letters, numbers, and underscores only.</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={form.email} disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <p className="settings__hint">Email cannot be changed.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Bio <span className="form-hint">(max 200 chars)</span></label>
                <textarea className="form-textarea" name="bio" value={form.bio} onChange={handle}
                  rows={3} maxLength={200}
                  placeholder="A short introduction — your region, interests in mythology, what draws you to folklore…" />
                <p className="settings__char-count">{form.bio.length}/200</p>
              </div>

              <button className="btn btn-gold" onClick={handleProfileSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            {/* Role Badge */}
            <div className="settings__section settings__role-section">
              <h3 className="settings__section-title">Account Role</h3>
              <div className="settings__role-row">
                <span className="badge badge-gold" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                  {user.role === 'admin' ? '🛡 Admin' : user.role === 'contributor' ? '✍️ Contributor' : '📖 Reader'}
                </span>
                <div className="settings__role-desc">
                  {user.role === 'user' && (
                    <p>Upgrade to <strong>Contributor</strong> to submit your own stories for free.</p>
                  )}
                  {user.role === 'contributor' && (
                    <p>You can submit stories for review via the <Link to="/contribute">Contribute</Link> page.</p>
                  )}
                  {user.role === 'admin' && (
                    <p>Full access including the <Link to="/admin">Admin Dashboard</Link>.</p>
                  )}
                </div>
              </div>
              {user.role === 'user' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.75rem' }}
                  onClick={async () => {
                    try {
                      await api.patch('/auth/become-contributor');
                      dispatch(getMe());
                      toast.success('You are now a Contributor!');
                    } catch { toast.error('Failed to upgrade role.'); }
                  }}
                >Become a Contributor</button>
              )}
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="settings__panel">
            <div className="settings__section">
              <h3 className="settings__section-title">Change Password</h3>

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" name="current"
                  value={passwords.current} onChange={handlePwd} placeholder="Your current password" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" name="next"
                  value={passwords.next} onChange={handlePwd} placeholder="At least 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" name="confirm"
                  value={passwords.confirm} onChange={handlePwd} placeholder="Repeat new password" />
              </div>

              {passwords.next && passwords.confirm && passwords.next !== passwords.confirm && (
                <p className="settings__error">Passwords do not match.</p>
              )}

              <button
                className="btn btn-gold"
                onClick={handlePasswordSave}
                disabled={saving || !passwords.current || !passwords.next || passwords.next !== passwords.confirm}
              >
                {saving ? 'Saving…' : 'Update Password'}
              </button>
            </div>

            <div className="settings__section settings__danger-zone">
              <h3 className="settings__section-title settings__danger-title">Danger Zone</h3>
              <p className="settings__hint" style={{ marginBottom: '1rem' }}>
                These actions are irreversible. Please be certain.
              </p>
              <button
                className="btn settings__danger-btn"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                    toast.error('Account deletion requires contacting support.');
                  }
                }}
              >
                Delete My Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
