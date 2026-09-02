import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { COUNTRIES } from '../assets/data/countries';
import { CATEGORIES } from '../assets/data/categories';
import './Contribute.css';

const STEPS = ['Basic Info', 'The Story', 'Media & Tags', 'Review'];

const ContributeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [originalStory, setOriginalStory] = useState(null);

  const [form, setForm] = useState({
    title: '',
    alternativeNames: '',
    country: '',
    category: '',
    shortDescription: '',
    fullStory: '',
    origin: '',
    significance: '',
    tags: '',
    references: '',
    coverImage: null,
  });

  useEffect(() => {
    const loadStory = async () => {
      try {
        const res = await api.get(`/stories/id/${id}`);
        const s = res.data.data;
        setOriginalStory(s);
        setForm({
          title: s.title || '',
          alternativeNames: (s.alternativeNames || []).join(', '),
          country: s.country || '',
          category: s.category || '',
          shortDescription: s.shortDescription || '',
          fullStory: s.fullStory || '',
          origin: s.origin || '',
          significance: s.significance || '',
          tags: (s.tags || []).join(', '),
          references: (s.references || []).map(r => (typeof r === 'string' ? r : r.title)).join('\n'),
          coverImage: s.coverImage || null,
        });
      } catch {
        toast.error('Could not load story.');
        navigate('/profile');
      }
      setFetching(false);
    };
    loadStory();
  }, [id, navigate]);

  if (!user) return <Navigate to="/" />;

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await api.post('/upload/story-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(p => ({ ...p, coverImage: res.data.data }));
      toast.success('Cover image uploaded!');
    } catch {
      toast.error('Image upload failed.');
    }
    setUploadingImage(false);
  };

  const handleSave = async (status) => {
    setLoading(true);
    // Admin editing a story publishes directly as approved
    const resolvedStatus = status === 'pending' && user.role === 'admin' ? 'approved' : status;
    const payload = {
      ...form,
      alternativeNames: form.alternativeNames ? form.alternativeNames.split(',').map(s => s.trim()) : [],
      tags: form.tags ? form.tags.split(',').map(s => s.trim().toLowerCase()) : [],
      references: form.references ? form.references.split('\n').map(s => s.trim()).filter(Boolean) : [],
      status: resolvedStatus,
    };
    try {
      await api.put(`/stories/${id}`, payload);
      toast.success(status === 'draft' ? 'Draft saved!' : user.role === 'admin' ? '🚀 Story published!' : '🚀 Story resubmitted for review!');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
    setLoading(false);
  };

  const canProceed = () => {
    if (step === 0) return form.title && form.country && form.category;
    if (step === 1) return form.shortDescription && form.fullStory?.length >= 100;
    return true;
  };

  if (fetching) return (
    <div className="contribute">
      <div className="loading-screen" style={{ paddingTop: '12rem' }}>
        <div className="spinner" /><p>Loading story…</p>
      </div>
    </div>
  );

  // Guard: a story currently under admin review can't be edited out from under them
  if (originalStory && originalStory.status === 'pending' && user.role !== 'admin') {
    return (
      <div className="contribute contribute--gate">
        <div className="container">
          <div className="contribute__gate-content">
            <span className="contribute__gate-icon">📖</span>
            <h2>Story Pending Review</h2>
            <p>This story is currently being reviewed and can't be edited right now. Check back once it's been approved or rejected.</p>
            <Link to="/profile" className="btn btn-gold">Back to Profile</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contribute">
      <div className="contribute__header">
        <div className="container">
          <Link to="/profile" style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'inline-block', marginBottom: '0.5rem' }}>
            ← Back to Profile
          </Link>
          <p className="section-eyebrow">Edit Submission</p>
          <h1>Edit Story</h1>
          {originalStory?.adminNote && (
            <div className="contribute__admin-note">
              <strong>📋 Admin Note:</strong> {originalStory.adminNote}
            </div>
          )}
        </div>
      </div>

      <div className="container">
        {/* Progress Steps */}
        <div className="contribute__steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`contribute__step ${i === step ? 'contribute__step--active' : i < step ? 'contribute__step--done' : ''}`}>
              <div className="contribute__step-num">{i < step ? '✓' : i + 1}</div>
              <span className="contribute__step-label">{s}</span>
              {i < STEPS.length - 1 && <div className="contribute__step-line" />}
            </div>
          ))}
        </div>

        <div className="contribute__form-wrap">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="contribute__step-content">
              <h2 className="contribute__step-title">Basic Info</h2>
              <div className="form-group">
                <label className="form-label">Story Title *</label>
                <input className="form-input" name="title" value={form.title} onChange={handle}
                  placeholder="e.g. Bhangarh Fort, The Legend of Vetala" required />
              </div>
              <div className="form-group">
                <label className="form-label">Alternative Names / Local Names</label>
                <input className="form-input" name="alternativeNames" value={form.alternativeNames} onChange={handle}
                  placeholder="Comma-separated" />
              </div>
              <div className="form-group">
                <label className="form-label">Country *</label>
                <select className="form-select" name="country" value={form.country} onChange={handle} required>
                  <option value="">Select Country</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <div className="contribute__cat-grid">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.slug}
                      type="button"
                      className={`contribute__cat-option ${form.category === cat.slug ? 'contribute__cat-option--selected' : ''}`}
                      onClick={() => setForm(p => ({ ...p, category: cat.slug }))}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: The Story */}
          {step === 1 && (
            <div className="contribute__step-content">
              <h2 className="contribute__step-title">The Story</h2>
              <div className="form-group">
                <label className="form-label">Short Description * <span className="form-hint">(max 400 chars)</span></label>
                <textarea className="form-textarea" name="shortDescription" value={form.shortDescription}
                  onChange={handle} maxLength={400} rows={3} />
                <p className="form-hint-count">{form.shortDescription.length}/400</p>
              </div>
              <div className="form-group">
                <label className="form-label">Full Story * <span className="form-hint">(min 100 chars)</span></label>
                <textarea className="form-textarea contribute__fullstory" name="fullStory"
                  value={form.fullStory} onChange={handle} rows={16} />
                <p className="form-hint-count">{form.fullStory.length} characters</p>
              </div>
              <div className="form-group">
                <label className="form-label">Historical Origin</label>
                <textarea className="form-textarea" name="origin" value={form.origin} onChange={handle} rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Cultural Significance</label>
                <textarea className="form-textarea" name="significance" value={form.significance} onChange={handle} rows={3} />
              </div>
            </div>
          )}

          {/* Step 2: Media & Tags */}
          {step === 2 && (
            <div className="contribute__step-content">
              <h2 className="contribute__step-title">Media & Tags</h2>
              <div className="form-group">
                <label className="form-label">Cover Image</label>
                <div className="contribute__upload-zone">
                  {form.coverImage ? (
                    <div className="contribute__upload-preview">
                      <img src={form.coverImage.url} alt="Cover" />
                      <button type="button" className="contribute__upload-remove"
                        onClick={() => setForm(p => ({ ...p, coverImage: null }))}>✕ Remove</button>
                    </div>
                  ) : (
                    <label className="contribute__upload-label">
                      <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                      <span className="contribute__upload-icon">🖼</span>
                      <span>{uploadingImage ? 'Uploading…' : 'Click to upload cover image'}</span>
                      <span className="contribute__upload-hint">JPG, PNG or WebP · Max 5MB</span>
                    </label>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags <span className="form-hint">(comma-separated)</span></label>
                <input className="form-input" name="tags" value={form.tags} onChange={handle}
                  placeholder="ghost, fort, rajasthan, haunted" />
              </div>
              <div className="form-group">
                <label className="form-label">References</label>
                <textarea className="form-textarea" name="references" value={form.references} onChange={handle} rows={3}
                  placeholder="One per line." />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="contribute__step-content">
              <h2 className="contribute__step-title">{user.role === 'admin' ? 'Review & Publish' : 'Review & Resubmit'}</h2>
              <div className="contribute__review">
                <div className="contribute__review-item">
                  <span className="contribute__review-label">Title</span>
                  <span className="contribute__review-value">{form.title || <em>Not set</em>}</span>
                </div>
                <div className="contribute__review-item">
                  <span className="contribute__review-label">Country</span>
                  <span className="contribute__review-value">{form.country || <em>Not set</em>}</span>
                </div>
                <div className="contribute__review-item">
                  <span className="contribute__review-label">Story Length</span>
                  <span className="contribute__review-value">{form.fullStory.length} characters</span>
                </div>
                <div className="contribute__review-item">
                  <span className="contribute__review-label">Cover Image</span>
                  <span className="contribute__review-value">{form.coverImage ? '✅ Uploaded' : '⚠ No image'}</span>
                </div>
              </div>
              <div className="contribute__review-notice">
                {originalStory?.status === 'approved' && user.role !== 'admin' && (
                  <p>⚠ This story is currently live. Resubmitting will unpublish it until an admin re-approves your changes.</p>
                )}
                <p>✦ Your edited story will be re-queued for review.</p>
                <p>✦ You can also save as draft to continue later.</p>
              </div>
              <div className="contribute__submit-actions">
                <button type="button" className="btn btn-ghost" onClick={() => handleSave('draft')} disabled={loading}>
                  Save as Draft
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-lg"
                  onClick={() => handleSave('pending')}
                  disabled={loading || !form.title || !form.country || !form.category || !form.fullStory}
                >
                  {loading ? 'Saving…' : user.role === 'admin' ? '🚀 Publish' : '🚀 Resubmit for Review'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="contribute__nav">
            {step > 0 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            {step < STEPS.length - 1 && (
              <button className="btn btn-gold" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributeEdit;
