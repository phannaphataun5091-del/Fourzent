'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../lib/media';
import { StarsView, StarsInput } from '../../components/Stars';
import FallingHearts from '../../components/FallingHearts';

const fmt = (d) =>
  new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

function MusicPlayer({ src, title }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="player">
      <button type="button" onClick={toggle} aria-label={playing ? 'หยุดเพลง' : 'เล่นเพลง'}>
        {playing ? '❚❚' : '▶'}
      </button>
      <span>{title || 'เพลงประจำเว็บ'}</span>
      <audio ref={ref} src={src} loop preload="none" />
    </div>
  );
}

export default function ReviewPage() {
  const [settings, setSettings] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function load() {
    const [s, r] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase
        .from('reviews')
        .select('*, review_images(id,url)')
        .eq('status', 'visible')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    setSettings(s.data);
    setReviews(r.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (settings?.site_name) document.title = settings.site_name;
  }, [settings]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  function pickFiles(e) {
    const list = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...list].slice(0, 4));
    e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!rating) return setMsg({ type: 'error', text: 'กรุณาเลือกคะแนนดาวก่อนส่ง' });
    if (!message.trim()) return setMsg({ type: 'error', text: 'กรุณาเขียนข้อความรีวิว' });

    setBusy(true);
    try {
      const id = crypto.randomUUID();
      const urls = [];
      for (const f of files) urls.push(await uploadFile(f, 'reviews'));

      const { error } = await supabase.from('reviews').insert({
        id,
        name: name.trim() || 'ไม่ระบุชื่อ',
        rating,
        message: message.trim(),
      });
      if (error) throw error;

      if (urls.length) {
        const { error: imgError } = await supabase
          .from('review_images')
          .insert(urls.map((url) => ({ review_id: id, url })));
        if (imgError) throw imgError;
      }

      setName('');
      setRating(0);
      setMessage('');
      setFiles([]);
      setMsg({ type: 'ok', text: 'ส่งรีวิวแล้ว ขอบคุณที่ให้คะแนนค่ะ' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: `ส่งรีวิวไม่สำเร็จ: ${err.message || 'ลองใหม่อีกครั้ง'}` });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="wrap"><p className="empty">กำลังโหลด…</p></div>;

  const s = settings || {};
  const accent = s.accent_color || '#2F80ED';

  return (
    <div style={{ '--accent': accent }}>
      <FallingHearts />
      <section className="hero" style={s.cover_url ? { backgroundImage: `url(${s.cover_url})` } : undefined}>
        <div className="hero-inner">
          <div>
            <h1>{s.site_name || 'Fourzent'}</h1>
            {s.tagline && <p className="tagline">{s.tagline}</p>}
            {s.music_url && <MusicPlayer src={s.music_url} title={s.music_title} />}
          </div>
          {s.gif_url && <img className="sticker" src={s.gif_url} alt="" />}
        </div>
      </section>

      <main className="wrap">
        <div className="summary">
          <div><strong>{reviews.length}</strong><span>รีวิว</span></div>
          {reviews.length > 0 && (
            <div>
              <strong>{average.toFixed(1)}</strong>
              <StarsView value={average} />
            </div>
          )}
        </div>

        <div className="layout">
          <section className="card form-card" aria-labelledby="form-title">
            <h2 id="form-title">เขียนรีวิว</h2>
            {s.reviews_open === false ? (
              <p className="hint" style={{ marginTop: '0.75rem' }}>
                ขณะนี้ปิดรับรีวิวชั่วคราว กลับมาใหม่ภายหลังได้เลย
              </p>
            ) : (
              <form onSubmit={submit} style={{ marginTop: '1rem' }}>
                {msg && <div className={`msg ${msg.type}`} role="status">{msg.text}</div>}
                <div className="field">
                  <label htmlFor="r-name">ชื่อ (ไม่ใส่ก็ได้)</label>
                  <input id="r-name" type="text" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>คะแนน</label>
                  <StarsInput value={rating} onChange={setRating} />
                </div>
                <div className="field">
                  <label htmlFor="r-msg">ข้อความรีวิว</label>
                  <textarea id="r-msg" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="r-img">แนบรูป (สูงสุด 4 รูป)</label>
                  <input id="r-img" type="file" accept="image/*" multiple onChange={pickFiles} disabled={files.length >= 4} />
                  {previews.length > 0 && (
                    <div className="thumbs">
                      {previews.map((u, i) => (
                        <div className="thumb-wrap" key={u}>
                          <img src={u} alt={`รูปที่ ${i + 1}`} />
                          <button type="button" aria-label={`เอารูปที่ ${i + 1} ออก`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="hint" style={{ marginTop: '0.4rem' }}>ส่งแล้วแก้ไขหรือลบเองไม่ได้ ถ้าต้องการแก้ให้ติดต่อแอดมิน</p>
                </div>
                <button type="submit" disabled={busy} style={{ width: '100%' }}>
                  {busy ? 'กำลังส่ง…' : 'ส่งรีวิว'}
                </button>
              </form>
            )}
          </section>

          <section aria-label="รีวิว">
            <h2 style={{ marginBottom: '1rem' }}>รีวิวทั้งหมด ({reviews.length})</h2>
            <div className="list">
              {reviews.length === 0 && <p className="empty">ยังไม่มีรีวิว มาเป็นคนแรกได้เลย</p>}
              {reviews.map((r) => (
                <article className="item" key={r.id}>
                  <header>
                    <span className="who">{r.name}</span>
                    <StarsView value={r.rating} />
                  </header>
                  <p className="when">{fmt(r.created_at)}</p>
                  {r.message && <p className="body">{r.message}</p>}
                  {r.review_images?.length > 0 && (
                    <div className="thumbs">
                      {r.review_images.map((im) => (
                        <a key={im.id} href={im.url} target="_blank" rel="noreferrer">
                          <img src={im.url} alt="รูปแนบรีวิว" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      {s.footer_text && <p className="footer">{s.footer_text}</p>}
    </div>
  );
}
