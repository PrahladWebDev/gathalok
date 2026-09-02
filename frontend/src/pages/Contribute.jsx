import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createStory } from '../store/slices/storySlice';
import { openAuthModal } from '../store/slices/uiSlice';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { COUNTRIES } from '../assets/data/countries';
import { CATEGORIES } from '../assets/data/categories';
import './Contribute.css';

const STEPS = ['Basic Info', 'The Story', 'Media & Tags', 'Review'];

const Contribute = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { loading } = useSelector(s => s.stories);

  const [step, setStep] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  if (!user) {
    return (
      <div className="contribute contribute--gate">
        <div className="container">
          <div className="contribute__gate-content">
            <span className="contribute__gate-icon">✍️</span>
            <h2>Become a Contributor</h2>
            <p>Sign in to share stories from the world's rich folklore traditions with our community.</p>
            <button className="btn btn-gold btn-lg" onClick={() => dispatch(openAuthModal('login'))}>
              Sign In to Contribute
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'user') {
    return (
      <div className="contribute contribute--gate">
        <div className="container">
          <div className="contribute__gate-content">
            <span className="contribute__gate-icon">📜</span>
            <h2>Become a Contributor</h2>
            <p>Upgrade your account to start submitting stories. It's free and takes just one click.</p>
            <button
              className="btn btn-gold btn-lg"
              onClick={async () => {
                const res = await dispatch(require('../store/slices/authSlice').becomeContributor());
                if (res.meta.requestStatus === 'fulfilled') {
                  toast.success('You are now a Contributor!');
                }
              }}
            >
              Become a Contributor
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      toast.error('Image upload failed. Please try again.');
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (status) => {
    const resolvedStatus = status === 'pending' && user.role === 'admin' ? 'approved' : status;
    const payload = {
      ...form,
      alternativeNames: form.alternativeNames ? form.alternativeNames.split(',').map(s => s.trim()) : [],
      tags: form.tags ? form.tags.split(',').map(s => s.trim().toLowerCase()) : [],
      references: form.references ? form.references.split('\n').map(s => s.trim()).filter(Boolean) : [],
      status: resolvedStatus,
    };
    const res = await dispatch(createStory(payload));
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success(status === 'draft' ? 'Draft saved!' : user.role === 'admin' ? '🚀 Story published!' : '🎉 Story submitted for review!');
      navigate('/profile');
    } else {
      toast.error(res.payload || 'Submission failed.');
    }
  };

  const canProceed = () => {
    if (step === 0) return form.title && form.country && form.category;
    if (step === 1) return form.shortDescription && form.fullStory?.length >= 100;
    return true;
  };

  return (
    <div className="contribute">
      <div className="contribute__header">
        <div className="container">
          <p className="section-eyebrow">Share Your Knowledge</p>
          <h1>Submit a Story</h1>
          <p className="contribute__subtitle">
            Your submission will be reviewed by our team and published within 1–3 days.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Progress Steps */}
        <div className="contribute__steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`contribute__step ${i === step ? 'contribute__step--active' : ''} ${i < step ? 'contribute__step--done' : ''}`}>
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
              <h2 className="contribute__step-title">Basic Information</h2>

              <div className="form-group">
                <label className="form-label">Story Title *</label>
                <input className="form-input" name="title" value={form.title} onChange={handle}
                  placeholder="e.g. Bhangarh Fort, The Legend of Vetala" required />
              </div>

              <div className="form-group">
                <label className="form-label">Alternative Names / Local Names</label>
                <input className="form-input" name="alternativeNames" value={form.alternativeNames} onChange={handle}
                  placeholder="Comma-separated: Bhangad Fort, The Cursed Citadel" />
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
                <label className="form-label">Short Description * <span className="form-hint">(max 400 chars — appears on cards)</span></label>
                <textarea className="form-textarea" name="shortDescription" value={form.shortDescription}
                  onChange={handle} maxLength={400} rows={3}
                  placeholder="A compelling one-paragraph summary that will make readers want to read more…" />
                <p className="form-hint-count">{form.shortDescription.length}/400</p>
              </div>

              <div className="form-group">
                <label className="form-label">Full Story * <span className="form-hint">(min 100 chars)</span></label>
                <textarea className="form-textarea contribute__fullstory" name="fullStory"
                  value={form.fullStory} onChange={handle} rows={16}
                  placeholder="Write the complete legend here. Use double line breaks for paragraphs. Include dialogue, historical context, the supernatural elements, and why it matters. The more vivid and detailed, the better…" />
                <p className="form-hint-count">{form.fullStory.length} characters</p>
              </div>

              <div className="form-group">
                <label className="form-label">Historical Origin</label>
                <textarea className="form-textarea" name="origin" value={form.origin} onChange={handle} rows={3}
                  placeholder="When and where did this legend originate? What historical events are connected?" />
              </div>

              <div className="form-group">
                <label className="form-label">Cultural Significance</label>
                <textarea className="form-textarea" name="significance" value={form.significance} onChange={handle} rows={3}
                  placeholder="Why does this story matter to the community? What does it represent culturally or spiritually?" />
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
                      <button
                        type="button"
                        className="contribute__upload-remove"
                        onClick={() => setForm(p => ({ ...p, coverImage: null }))}
                      >✕ Remove</button>
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
                  placeholder="ghost, fort, rajasthan, haunted, princess, sorcerer" />
              </div>

              <div className="form-group">
                <label className="form-label">References</label>
                <textarea className="form-textarea" name="references" value={form.references} onChange={handle} rows={3}
                  placeholder="Books, articles, or websites you used. One per line." />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="contribute__step-content">
              <h2 className="contribute__step-title">Review & Submit</h2>
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
                  <span className="contribute__review-value">{form.coverImage ? '✅ Uploaded' : '⚠ No image (optional)'}</span>
                </div>
                <div className="contribute__review-item">
                  <span className="contribute__review-label">Tags</span>
                  <span className="contribute__review-value">{form.tags || <em>None</em>}</span>
                </div>
              </div>

              <div className="contribute__review-notice">
                <p>✦ After submission, our team will review your story within 1–3 days.</p>
                <p>✦ You'll receive a notification when it's approved or if changes are needed.</p>
                <p>✦ You can save as draft to finish later.</p>
              </div>

              <div className="contribute__submit-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleSubmit('draft')}
                  disabled={loading}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-lg"
                  onClick={() => handleSubmit('pending')}
                  disabled={loading || !form.title || !form.country || !form.category || !form.fullStory}
                >
                  {loading ? 'Submitting…' : user.role === 'admin' ? '🚀 Publish' : '🚀 Submit for Review'}
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
              <button
                className="btn btn-gold"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contribute;
