import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import './StoryEditor.css';

/*
 * Visual (WYSIWYG) story editor + renderer.
 *
 * Saved format — still just a string inside `fullStory`, so NO backend change:
 *   paragraphs ........ separated by a blank line
 *   **bold**  *italic*
 *   ## Heading   > Quote   - List item
 *   [[img|align|width%|url|caption]]     align: left | right | center | full
 *
 * Old stories (and old tokens using s / m / l sizes) keep working.
 */

const IMG_RE = /^\[\[img\|(left|right|center|full)\|(\d{1,3}|s|m|l)\|(https?:\/\/[^|\]\s]+)\|?([^\]]*)\]\]$/;
const LEGACY = {
  left: { s: 28, m: 40, l: 55 }, right: { s: 28, m: 40, l: 55 },
  center: { s: 40, m: 65, l: 85 }, full: { s: 100, m: 100, l: 100 },
};
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export const makeImgToken = ({ align = 'center', width = 60, url, caption = '' }) =>
  `[[img|${align}|${clamp(Math.round(width), 10, 100)}|${url}|${String(caption).replace(/[|\[\]\n]/g, ' ').trim()}]]`;

const parseImg = (block) => {
  const m = block.trim().match(IMG_RE);
  if (!m) return null;
  const width = /^\d+$/.test(m[2]) ? clamp(parseInt(m[2], 10), 10, 100) : LEGACY[m[1]][m[2]];
  return { align: m[1], width, url: m[3], caption: (m[4] || '').trim() };
};

const splitBlocks = (text) =>
  (text || '').split(/\n{2,}/).map(b => b.replace(/^\n+|\n+$/g, '')).filter(b => b.trim() !== '');

/** Plain text without markup — for “Listen” and length checks. */
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

/* ─── Renderer (story page) ──────────────────────────────── */
export const StoryContent = ({ text }) => {
  const blocks = useMemo(() => splitBlocks(text), [text]);
  return (
    <div className="prose story-content">
      {blocks.map((block, i) => {
        const img = parseImg(block);
        if (img) {
          return (
            <figure key={i} className={`sc-img sc-img--${img.align}`}
              style={img.align === 'full' ? undefined : { width: `${img.width}%` }}>
              <img src={img.url} alt={img.caption || 'Story illustration'} loading="lazy" />
              {img.caption && <figcaption>{img.caption}</figcaption>}
            </figure>
          );
        }
        if (block.startsWith('## ')) return <h3 key={i}>{renderInline(block.slice(3))}</h3>;
        if (block.startsWith('> ')) return <blockquote key={i}>{renderInline(block.replace(/^>\s?/gm, ''))}</blockquote>;
        const lines = block.split('\n');
        if (lines.every(l => l.startsWith('- '))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{renderInline(l.slice(2))}</li>)}</ul>;
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
};

/* ─── string  <->  editor DOM ────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uid = () => Math.random().toString(36).slice(2, 9);
const inlineToHtml = (t) =>
  esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\n/g, '<br>');

const figHtml = (img) =>
  `<figure class="sc-img sc-img--${img.align} se-fig" contenteditable="false" data-img="1" data-id="${uid()}" ` +
  `data-align="${img.align}" data-width="${img.width}" data-url="${esc(img.url)}" data-caption="${esc(img.caption)}" ` +
  `style="${img.align === 'full' ? '' : `width:${img.width}%`}">` +
  `<span class="se-box"><img src="${esc(img.url)}" alt="" draggable="false"/>` +
  `<span class="se-h se-h--move" data-h="move" title="Drag to move">✥</span>` +
  `<span class="se-h se-h--size" data-h="size" title="Drag to resize"></span></span>` +
  `<figcaption>${esc(img.caption)}</figcaption></figure>`;

const stringToHtml = (value) => {
  const html = splitBlocks(value).map((block) => {
    const img = parseImg(block);
    if (img) return figHtml(img);
    if (block.startsWith('## ')) return `<h3>${inlineToHtml(block.slice(3))}</h3>`;
    if (block.startsWith('> ')) return `<blockquote>${inlineToHtml(block.replace(/^>\s?/gm, ''))}</blockquote>`;
    const lines = block.split('\n');
    if (lines.every(l => l.startsWith('- '))) return `<ul>${lines.map(l => `<li>${inlineToHtml(l.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${inlineToHtml(block)}</p>`;
  }).join('');
  return html || '<p><br></p>';
};

const inlineOf = (node) => {
  let out = '';
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out += n.nodeValue.replace(/\u00a0/g, ' '); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (tag === 'BR') out += '\n';
    else if (tag === 'FIGURE') return;
    else if (tag === 'B' || tag === 'STRONG' || tag === 'I' || tag === 'EM') {
      const mark = tag === 'B' || tag === 'STRONG' ? '**' : '*';
      const t = inlineOf(n);
      const [, a, mid, b] = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      out += mid ? `${a}${mark}${mid}${mark}${b}` : t;
    } else out += inlineOf(n);
  });
  return out;
};

const domToString = (root) => {
  const blocks = [];
  root.childNodes.forEach((n) => {
    if (n.nodeType === 3) { const t = n.nodeValue.trim(); if (t) blocks.push(t); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (tag === 'FIGURE') {
      if (n.dataset.url) {
        blocks.push(makeImgToken({
          align: n.dataset.align, width: parseInt(n.dataset.width, 10) || 60,
          url: n.dataset.url, caption: n.dataset.caption || '',
        }));
      }
    } else if (/^H[1-6]$/.test(tag)) {
      const t = inlineOf(n).replace(/\n/g, ' ').trim();
      if (t) blocks.push(`## ${t}`);
    } else if (tag === 'BLOCKQUOTE') {
      const t = inlineOf(n).trim();
      if (t) blocks.push(t.split('\n').map(l => `> ${l}`).join('\n'));
    } else if (tag === 'UL' || tag === 'OL') {
      const items = [...n.children].map(li => inlineOf(li).replace(/\n/g, ' ').trim()).filter(Boolean);
      if (items.length) blocks.push(items.map(i => `- ${i}`).join('\n'));
    } else {
      const t = inlineOf(n).trim();
      if (t) blocks.push(t);
    }
  });
  return blocks.join('\n\n');
};

const setFigAlign = (fig, align) => {
  ['left', 'right', 'center', 'full'].forEach(a => fig.classList.remove(`sc-img--${a}`));
  fig.classList.add(`sc-img--${align}`);
  fig.dataset.align = align;
  if ((align === 'left' || align === 'right') && parseInt(fig.dataset.width, 10) > 60) fig.dataset.width = 40;
  fig.style.width = align === 'full' ? '' : `${fig.dataset.width}%`;
};

const Btn = ({ onClick, title, children, on }) => (
  <button type="button" className={`se__btn ${on ? 'se__btn--on' : ''}`} title={title}
    onMouseDown={e => e.preventDefault()} onClick={onClick}>{children}</button>
);

const ALIGNS = [
  { v: 'left', label: '⬅ Left' }, { v: 'center', label: '⬌ Center' },
  { v: 'right', label: 'Right ➡' }, { v: 'full', label: '▭ Full' },
];

/* ─── Editor ─────────────────────────────────────────────── */
const StoryEditor = ({ value, onChange }) => {
  const rootRef = useRef(null);
  const wrapRef = useRef(null);
  const dropRef = useRef(null);
  const fileRef = useRef(null);
  const lastEmitted = useRef(null);
  const savedRange = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [, setTick] = useState(0);

  const updateEmpty = () => {
    const r = rootRef.current;
    if (r) r.dataset.empty = (!r.querySelector('figure') && r.textContent.trim() === '') ? 'true' : 'false';
  };

  const emit = () => {
    const s = domToString(rootRef.current);
    lastEmitted.current = s;
    onChange(s);
    updateEmpty();
    setTick(t => t + 1);
  };

  // load the saved string into the editor (on mount, or when changed from outside)
  useLayoutEffect(() => {
    if (value !== lastEmitted.current) {
      rootRef.current.innerHTML = stringToHtml(value || '');
      lastEmitted.current = value || '';
      updateEmpty();
    }
  }, [value]);

  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
      document.execCommand('styleWithCSS', false, false);
    } catch { /* ignore */ }
    const onSel = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && rootRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  // highlight the selected image
  useEffect(() => {
    rootRef.current.querySelectorAll('figure[data-img]').forEach(f =>
      f.classList.toggle('se-fig--sel', f.dataset.id === selectedId));
  });

  const restoreSel = () => {
    const r = savedRange.current;
    if (!r) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const cmd = (name, val) => {
    rootRef.current.focus();
    restoreSel();
    document.execCommand(name, false, val);
    emit();
  };

  const toggleBlock = (tag) => {
    rootRef.current.focus();
    restoreSel();
    const cur = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
    document.execCommand('formatBlock', false, cur === tag ? '<p>' : `<${tag}>`);
    emit();
  };

  /* ── insert uploaded images at the caret (splitting the paragraph if needed) ── */
  const insertFigures = (imgs) => {
    const root = rootRef.current;
    let range = savedRange.current;
    if (!range || !root.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = imgs.map(figHtml).join('');
    const figs = [...tmp.children];

    let node = range.startContainer;
    while (node && node.parentNode !== root) node = node.parentNode;

    if (!node) {
      figs.forEach(f => root.appendChild(f));
    } else if (node.tagName === 'FIGURE') {
      let ref = node;
      figs.forEach(f => { ref.after(f); ref = f; });
    } else {
      const head = document.createRange();
      head.setStart(node, 0);
      head.setEnd(range.startContainer, range.startOffset);
      if (head.toString().trim() === '') {
        figs.forEach(f => node.before(f));
      } else {
        const tail = document.createRange();
        tail.setStart(range.startContainer, range.startOffset);
        tail.setEnd(node, node.childNodes.length);
        const tailFrag = tail.extractContents();
        let ref = node;
        figs.forEach(f => { ref.after(f); ref = f; });
        if (tailFrag.textContent.trim() !== '') {
          const p = document.createElement('p');
          p.appendChild(tailFrag);
          ref.after(p);
        }
      }
    }
    if (root.lastElementChild?.tagName === 'FIGURE') {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      root.appendChild(p);
    }
    setSelectedId(figs[0].dataset.id);
    emit();
  };

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const imgs = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('image', file);
      try {
        const res = await api.post('/upload/story-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        imgs.push({ align: 'center', width: 60, url: res.data.data.url, caption: '' });
      } catch {
        toast.error(`Upload failed: ${file.name}`);
      }
    }
    if (imgs.length) {
      insertFigures(imgs);
      toast.success('Image added — drag it to move, drag the corner dot to resize.');
    }
    setUploading(false);
  };

  /* ── drag the corner dot: resize ── */
  const startResize = (e, fig) => {
    const root = rootRef.current;
    const cs = getComputedStyle(root);
    const contentW = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const startW = fig.getBoundingClientRect().width;
    const startX = e.clientX;
    const align = fig.dataset.align;
    const mv = (ev) => {
      let dx = ev.clientX - startX;
      if (align === 'right') dx = -dx;
      if (align === 'center' || align === 'full') dx *= 2;
      const pct = clamp(Math.round(((startW + dx) / contentW) * 100), 10, 100);
      if (fig.dataset.align === 'full') setFigAlign(fig, 'center');
      fig.dataset.width = pct;
      fig.style.width = `${pct}%`;
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      emit();
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  /* ── drag the ✥ handle: move (drop position + left/center/right zone) ── */
  const startMove = (fig) => {
    const root = rootRef.current;
    const ind = dropRef.current;
    let target = null;
    let newAlign = fig.dataset.align;
    fig.classList.add('se-fig--dragging');
    document.body.style.userSelect = 'none';
    const mv = (ev) => {
      const blocks = [...root.children].filter(c => c !== fig && c.tagName !== 'FIGURE');
      if (!blocks.length) return;
      let best = null; let bd = Infinity;
      blocks.forEach((b) => {
        const r = b.getBoundingClientRect();
        const d = ev.clientY < r.top ? r.top - ev.clientY : ev.clientY > r.bottom ? ev.clientY - r.bottom : 0;
        if (d < bd) { bd = d; best = b; }
      });
      const r = best.getBoundingClientRect();
      const before = ev.clientY < r.top + r.height / 2;
      const rr = root.getBoundingClientRect();
      const x = (ev.clientX - rr.left) / rr.width;
      newAlign = fig.dataset.align === 'full' ? 'full' : x < 0.33 ? 'left' : x > 0.66 ? 'right' : 'center';
      target = { block: best, before };
      const wr = wrapRef.current.getBoundingClientRect();
      ind.style.display = 'block';
      ind.style.top = `${(before ? r.top : r.bottom) - wr.top - 1}px`;
      ind.textContent = newAlign === 'full' ? 'Full width' : newAlign.charAt(0).toUpperCase() + newAlign.slice(1);
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      ind.style.display = 'none';
      fig.classList.remove('se-fig--dragging');
      document.body.style.userSelect = '';
      if (target) {
        if (target.before) target.block.before(fig); else target.block.after(fig);
        setFigAlign(fig, newAlign);
      }
      emit();
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  const onPointerDown = (e) => {
    const fig = e.target.closest?.('figure[data-img]');
    setSelectedId(fig ? fig.dataset.id : null);
    const h = e.target.closest?.('[data-h]');
    if (!fig || !h) return;
    e.preventDefault();
    if (h.dataset.h === 'size') startResize(e, fig); else startMove(fig);
  };

  const onPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const onDrop = (e) => {
    if (e.dataTransfer?.files?.length) {
      e.preventDefault();
      uploadFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
    }
  };

  /* ── selected-image panel ── */
  const sel = selectedId ? rootRef.current?.querySelector(`figure[data-id="${selectedId}"]`) : null;
  const panelAlign = (a) => { setFigAlign(sel, a); emit(); };
  const panelWidth = (w) => {
    if (sel.dataset.align === 'full') setFigAlign(sel, 'center');
    sel.dataset.width = w;
    sel.style.width = `${w}%`;
    emit();
  };
  const panelCaption = (c) => {
    sel.dataset.caption = c;
    sel.querySelector('figcaption').textContent = c;
    emit();
  };
  const panelMove = (dir) => {
    const sib = dir < 0 ? sel.previousElementSibling : sel.nextElementSibling;
    if (!sib) return;
    if (dir < 0) sib.before(sel); else sib.after(sel);
    emit();
  };
  const panelRemove = () => { sel.remove(); setSelectedId(null); emit(); };

  return (
    <div className="se">
      <div className="se__toolbar">
        <Btn title="Bold" onClick={() => cmd('bold')}><b>B</b></Btn>
        <Btn title="Italic" onClick={() => cmd('italic')}><i>I</i></Btn>
        <Btn title="Heading" onClick={() => toggleBlock('h3')}>H</Btn>
        <Btn title="Quote" onClick={() => toggleBlock('blockquote')}>❝</Btn>
        <Btn title="Bullet list" onClick={() => cmd('insertUnorderedList')}>• List</Btn>
        <span className="se__sep" />
        <Btn title="Upload image(s) and insert at the cursor" onClick={() => fileRef.current?.click()}>
          {uploading ? 'Uploading…' : '🖼 Add Image'}
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ''; uploadFiles(f); }} />
      </div>

      <div className="se__wrap" ref={wrapRef}>
        <div
          ref={rootRef}
          className="se__editor prose story-content"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          data-ph="Write the legend here. Click where you want a picture, then press “Add Image”…"
          onInput={emit}
          onPointerDown={onPointerDown}
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={(e) => e.dataTransfer?.types?.includes('Files') && e.preventDefault()}
        />
        <div className="se__drop" ref={dropRef} />
      </div>

      {sel && (
        <div className="se__panel">
          <p className="se__panel-title">Selected image</p>
          <div className="se__group">
            {ALIGNS.map(a => (
              <button key={a.v} type="button"
                className={`se__chip ${sel.dataset.align === a.v ? 'se__chip--on' : ''}`}
                onClick={() => panelAlign(a.v)}>{a.label}</button>
            ))}
          </div>
          <label className="se__range">
            <span>Size {sel.dataset.align === 'full' ? '100' : sel.dataset.width}%</span>
            <input type="range" min="10" max="100"
              value={sel.dataset.align === 'full' ? 100 : parseInt(sel.dataset.width, 10)}
              onChange={e => panelWidth(parseInt(e.target.value, 10))} />
          </label>
          <input className="form-input se__caption" placeholder="Caption (optional)"
            value={sel.dataset.caption || ''} onChange={e => panelCaption(e.target.value)} />
          <div className="se__group">
            <button type="button" className="se__chip" onClick={() => panelMove(-1)}>↑ Move up</button>
            <button type="button" className="se__chip" onClick={() => panelMove(1)}>↓ Move down</button>
            <button type="button" className="se__chip se__chip--danger" onClick={panelRemove}>✕ Remove</button>
            <button type="button" className="se__chip" onClick={() => setSelectedId(null)}>Done</button>
          </div>
        </div>
      )}

      <p className="se__hint">
        Click an image to select it · drag <b>✥</b> to move it (drop on the left / middle / right of the text to wrap it that side) ·
        drag the <b>corner dot</b> to stretch or shrink. The text re-flows around it automatically.
      </p>
      <p className="form-hint-count se__count">{stripStoryMarkup(value || '').length} characters</p>
    </div>
  );
};

export default StoryEditor;
