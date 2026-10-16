import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ListenBar.css';

// "Listen to this tale" player for the story page, built on the browser's own
// text-to-speech (window.speechSynthesis): free, no API key, nothing sent to a server.
//
//   <ListenBar
//     title={story.title}
//     parts={[story.fullStory, story.origin, story.significance]}
//     locked={!user}
//     onLockedClick={() => dispatch(openAuthModal('login'))}
//   />
//
// - Text is read in short sentence-sized chunks (Chrome silently stops long utterances).
// - Pause stops at the current chunk; play continues from it.
// - Stops by itself when you leave the page or the story changes.
// - Guests see a locked bar that opens the login modal.
const SPEEDS = [0.85, 1, 1.25, 1.5];
const MAX_CHARS = 220;
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

function buildChunks(text) {
  const out = [];
  text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .forEach((p) => {
      const sentences = p.match(/[^.!?।]+[.!?।]*\s*/g) || [p];
      let cur = '';
      sentences.forEach((sentence) => {
        let s = sentence;
        if (cur && (cur + s).length > MAX_CHARS) { out.push(cur.trim()); cur = ''; }
        while (s.length > MAX_CHARS) {
          let cut = s.lastIndexOf(' ', MAX_CHARS);
          if (cut < 80) cut = MAX_CHARS;
          out.push(s.slice(0, cut).trim());
          s = s.slice(cut);
        }
        cur += s;
      });
      if (cur.trim()) out.push(cur.trim());
    });
  return out;
}

// Voices load asynchronously in most browsers, so look one up at speak time.
function pickVoice(lang) {
  const voices = synth ? synth.getVoices() : [];
  const norm = (v) => v.lang.replace('_', '-');
  const base = lang.split('-')[0];
  return voices.find((v) => norm(v) === lang) || voices.find((v) => norm(v).startsWith(base)) || null;
}

export default function ListenBar({ title, parts = [], locked = false, onLockedClick }) {
  const joined = parts.filter(Boolean).join('\n\n');
  const chunks = useMemo(
    () => buildChunks(`${title ? `${title}.\n\n` : ''}${joined}`),
    [title, joined]
  );
  // Devanagari text → Hindi voice; everything else → Indian English.
  const lang = /[\u0900-\u097F]/.test(joined) ? 'hi-IN' : 'en-IN';

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rateIdx, setRateIdx] = useState(1);
  const [failed, setFailed] = useState(false);
  const runId = useRef(0);   // bumped on every stop/start so stale callbacks are ignored
  const idxRef = useRef(0);  // chunk we're on (kept when paused, so play resumes)
  const rateRef = useRef(1);
  const uttRef = useRef(null); // keep a reference: some browsers garbage-collect a playing utterance

  const stop = useCallback(() => {
    runId.current += 1;
    if (synth) synth.cancel();
    setPlaying(false);
  }, []);

  const speakFrom = useCallback((i, id) => {
    if (id !== runId.current) return;
    if (i >= chunks.length) {
      idxRef.current = 0;
      setProgress(0);
      setPlaying(false);
      return;
    }
    idxRef.current = i;
    setProgress(i / chunks.length);
    const u = new SpeechSynthesisUtterance(chunks[i]);
    u.lang = lang;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = SPEEDS[rateRef.current];
    u.onend = () => speakFrom(i + 1, id);
    u.onerror = (e) => {
      if (id !== runId.current) return;
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      runId.current += 1;
      setPlaying(false);
      setFailed(true);
    };
    uttRef.current = u;
    synth.speak(u);
  }, [chunks, lang]);

  const start = useCallback((from) => {
    synth.cancel();
    runId.current += 1;
    setFailed(false);
    setPlaying(true);
    speakFrom(from, runId.current);
  }, [speakFrom]);

  const toggle = () => (playing ? stop() : start(idxRef.current));

  const cycleSpeed = () => {
    const next = (rateIdx + 1) % SPEEDS.length;
    rateRef.current = next;
    setRateIdx(next);
    if (playing) start(idxRef.current); // re-read the current sentence at the new speed
  };

  // Stop when the story changes, the guest lock appears, or the page is left.
  useEffect(() => () => { runId.current += 1; if (synth) synth.cancel(); }, [chunks]);
  useEffect(() => { if (locked) stop(); }, [locked, stop]);

  if (!synth || !chunks.length) return null;

  if (locked) {
    return (
      <button type="button" className="listen-bar listen-bar--locked" onClick={onLockedClick} aria-label="Sign in to listen to this story">
        <span className="listen-bar__btn listen-bar__btn--locked" aria-hidden="true">🔒</span>
        <span className="listen-bar__text">
          <span className="listen-bar__title">Listen to this tale</span>
          <span className="listen-bar__sub">Sign in to unlock narration</span>
        </span>
        <span className="listen-bar__chevron" aria-hidden="true">→</span>
      </button>
    );
  }

  const label = failed
    ? "Couldn't play audio in this browser"
    : playing ? 'Listening…' : progress > 0 ? 'Paused — press play to resume' : 'Listen to this tale';

  return (
    <div className="listen-bar" role="group" aria-label="Story narration">
      <button
        type="button"
        className="listen-bar__btn"
        onClick={toggle}
        aria-label={playing ? 'Pause narration' : 'Listen to this story'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <span className="listen-bar__text">
        <span className="listen-bar__title">{label}</span>
        <span className="listen-bar__track"><span className="listen-bar__fill" style={{ width: `${Math.round(progress * 100)}%` }} /></span>
      </span>
      <button
        type="button"
        className="listen-bar__speed"
        onClick={cycleSpeed}
        aria-label={`Narration speed ${SPEEDS[rateIdx]}x. Click to change.`}
      >
        {SPEEDS[rateIdx]}x
      </button>
    </div>
  );
}
