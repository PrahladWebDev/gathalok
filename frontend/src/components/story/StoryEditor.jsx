import React, { useRef, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import './StoryEditor.css';

/*
 * Story editor + renderer.
 *
 * Everything is stored inside the existing `fullStory` string, so the backend
 * and database need NO changes:
 *
 *   paragraphs ........ separated by a blank line
 *   **bold**  *italic*
 *   ## Heading         (line starts with "## ")
 *   > Quote            (line starts with "> ")
 *   - List item        (every line starts with "- ")
 *   [[img|align|size|url|caption]]   (its own paragraph)
 *        align: left | right | center | full
 *        size : s | m | l
 *
 * Left/right images float, so the text wraps around them and re-flows
 * automatically on any screen size.
 */

const IMG_RE = /^\[\[img\|(left|right|center|full)\|(s|m|l)\|(https?:\/\/[^|\]\s]+)\|?([^\]]*)\]\]$/;

export const makeImgToken = ({ align = 'center', size = 'm', url, caption = '' }) =>
  `[[img|${align}|${size}|${url}|${String(caption).replace(/[|\[\]\n]/g, ' ').trim()}]]`;

const parseImg = (block) => {
  const m = block.trim().match(IMG_RE);
  return m ? { align: m[1], size: m[2], url: m[3], caption: (m[4] || '').trim() } : null;
};

const splitBlocks = (text) => (text || '').split(/\n{2,}/).map(b => b.replace(/^\n+|\n+$/g, '')).filter(b => b.trim() !== '');

/** Plain text (no markup) — used for the "Listen" feature and length checks. */
export const stripStoryMarkup = (text) =>
  splitBlocks(text)
    .filter(b => !parseImg(b))
    .map(b => b.replace(/^(##\s+|>\s+|-\s+)/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'))
    .join('\n\n');

const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

/* ─── Renderer (used on the story page + live preview) ───── */
export const StoryContent = ({ text }) => {
  const blocks = useMemo(() => splitBlocks(text), [text]);
  return (
    <div className="prose story-content">
      {blocks.map((block, i) => {
        const img = parseImg(block);
        if (img) {
          return (
            <figure key={i} className={`sc-img sc-img--${img.align} sc-img--${img.size}`}>
              <img src={img.url} alt={img.caption || 'Story illustration'} loading="lazy" />
              {img.caption && <figcaption>{img.caption}</figcaption>}
            </figure>
          );
        }
        if (block.startsWith('## ')) return <h3 key={i} className="sc-heading">{renderInline(block.slice(3))}</h3>;
        if (block.startsWith('> ')) {
          return <blockquote key={i} className="sc-quote">{renderInline(block.replace(/^>\s?/gm, ''))}</blockquote>;
        }
        const lines = block.split('\n');
        if (lines.every(l => l.startsWith('- '))) {
          return <ul key={i} className="sc-list">{lines.map((l, j) => <li key={j}>{renderInline(l.slice(2))}</li>)}</ul>;
        }
        return <p key={i} className="sc-p">{renderInline(block)}</p>;
      })}
    </div>
  );
};

/* ─── Editor ─────────────────────────────────────────────── */
const ALIGNS = [
  { v: 'left', label: '⬅ Left', tip: 'Image on left, text wraps on the right' },
  { v: 'center', label: '⬌ Center', tip: 'Centered, text above and below' },
  { v: 'right', label: 'Right ➡', tip: 'Image on right, text wraps on the left' },
  { v: 'full', label: '▭ Full', tip: 'Full width' },
];
const SIZES = [{ v: 's', label: 'S' }, { v: 'm', label: 'M' }, { v: 'l', label: 'L' }];

const StoryEditor = ({ value, onChange, rows = 16 }) => {
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const blocks = splitBlocks(value);
  const images = blocks.map((b, idx) => ({ idx, img: parseImg(b) })).filter(x => x.img);

  const setBlocks = (arr) => onChange(arr.join('\n\n'));

  // ── text formatting at the cursor ──
  const wrapSelection = (before, after = before, placeholder = 'text') => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };

  const prefixLines = (prefix) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    let lineEnd = value.indexOf('\n', e);
    if (lineEnd === -1) lineEnd = value.length;
    const chunk = value.slice(lineStart, lineEnd) || 'text';
    const out = chunk.split('\n').map(l => (l.startsWith(prefix) ? l : prefix + l)).join('\n');
    onChange(value.slice(0, lineStart) + out + value.slice(lineEnd));
    requestAnimationFrame(() => ta.focus());
  };

  // ── insert image(s) at the cursor position ──
  const insertAtCursor = (tokens) => {
    const ta = taRef.current;
    const pos = ta ? ta.selectionStart : value.length;
    const before = value.slice(0, pos).replace(/\n+$/, '');
    const after = value.slice(pos).replace(/^\n+/, '');
    const mid = tokens.join('\n\n');
    onChange([before, mid, after].filter(Boolean).join('\n\n'));
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    const tokens = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('image', file);
      try {
        const res = await api.post('/upload/story-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        tokens.push(makeImgToken({ url: res.data.data.url, align: 'center', size: 'm' }));
      } catch {
        toast.error(`Upload failed: ${file.name}`);
      }
    }
    if (tokens.length) {
      insertAtCursor(tokens);
      toast.success(tokens.length > 1 ? `${tokens.length} images added at cursor` : 'Image added at cursor');
    }
    setUploading(false);
  };

  // ── edit one image block ──
  const updateImg = (idx, patch) => {
    const arr = [...blocks];
    arr[idx] = makeImgToken({ ...parseImg(arr[idx]), ...patch });
    setBlocks(arr);
  };
  const removeImg = (idx) => setBlocks(blocks.filter((_, i) => i !== idx));
  const moveBlock = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    const arr = [...blocks];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setBlocks(arr);
  };

  const Btn = ({ onClick, title, children }) => (
    <button type="button" className="se__btn" title={title} onMouseDown={e => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );

  return (
    <div className="se">
      <div className="se__toolbar">
        <Btn title="Bold" onClick={() => wrapSelection('**')}><b>B</b></Btn>
        <Btn title="Italic" onClick={() => wrapSelection('*')}><i>I</i></Btn>
        <Btn title="Heading" onClick={() => prefixLines('## ')}>H</Btn>
        <Btn title="Quote" onClick={() => prefixLines('> ')}>❝</Btn>
        <Btn title="Bullet list" onClick={() => prefixLines('- ')}>• List</Btn>
        <span className="se__sep" />
        <Btn title="Upload image(s) and insert at the cursor" onClick={() => fileRef.current?.click()}>
          {uploading ? 'Uploading…' : '🖼 Add Image'}
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
        <span className="se__spacer" />
        <button type="button" className={`se__btn ${showPreview ? 'se__btn--on' : ''}`} onClick={() => setShowPreview(v => !v)}>
          {showPreview ? '✎ Edit' : '👁 Preview'}
        </button>
      </div>

      {showPreview ? (
        <div className="se__preview"><StoryContent text={value} /></div>
      ) : (
        <textarea
          ref={taRef}
          className="form-textarea se__textarea"
          name="fullStory"
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder="Write the complete legend here. Leave a blank line between paragraphs. Click where you want a picture, then press “Add Image”…"
        />
      )}

      {images.length > 0 && (
        <div className="se__images">
          <p className="se__images-title">Images in your story ({images.length}) — pick position, size & caption</p>
          {images.map(({ idx, img }, n) => (
            <div className="se__img-row" key={idx}>
              <img src={img.url} alt="" className="se__thumb" />
              <div className="se__img-controls">
                <div className="se__group">
                  {ALIGNS.map(a => (
                    <button key={a.v} type="button" title={a.tip}
                      className={`se__chip ${img.align === a.v ? 'se__chip--on' : ''}`}
                      onClick={() => updateImg(idx, { align: a.v })}>{a.label}</button>
                  ))}
                </div>
                <div className="se__group">
                  {SIZES.map(s => (
                    <button key={s.v} type="button"
                      className={`se__chip ${img.size === s.v ? 'se__chip--on' : ''}`}
                      onClick={() => updateImg(idx, { size: s.v })}>{s.label}</button>
                  ))}
                  <button type="button" className="se__chip" title="Move up in the story" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}>↑</button>
                  <button type="button" className="se__chip" title="Move down in the story" onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}>↓</button>
                  <button type="button" className="se__chip se__chip--danger" onClick={() => removeImg(idx)}>✕ Remove</button>
                </div>
                <input
                  className="form-input se__caption"
                  placeholder={`Caption for image ${n + 1} (optional)`}
                  value={img.caption}
                  onChange={e => updateImg(idx, { caption: e.target.value })}
                />
              </div>
            </div>
          ))}
          <p className="se__hint">Left / Right images sit beside the text and the words re-flow around them automatically. Use ↑ ↓ to move an image between paragraphs.</p>
        </div>
      )}

      <p className="form-hint-count">{stripStoryMarkup(value).length} characters</p>
    </div>
  );
};

export default StoryEditor;
