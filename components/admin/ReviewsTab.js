'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile, removeByUrls } from '../../lib/media';
import { StarsInput, StarsView } from '../Stars';

const fmt = (d) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
const blank = () => ({ isNew: true, name: '', rating: 5, message: '', status: 'visible', images: [], originalImages: [] });

export default function ReviewsTab({ onChanged }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, review_images(id,url)')
      .order('created_at', { ascending: false });
    setItems(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((r) => {
      if (ratingFilter !== 'all' && r.rating !== Number(ratingFilter)) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!t) return true;
      return [r.name, r.message].some((v) => (v || '').toLowerCase().includes(t));
    });
  }, [items, q, ratingFilter, statusFilter]);

  const set = (patch) => setEditing((e) => ({ ...e, ...patch }));

  function startEdit(r) {
    setMsg(null);
    setEditing({
      id: r.id,
      name: r.name,
      rating: r.rating,
      message: r.message,
      status: r.status,
      images: [...(r.review_images || [])],
      originalImages: [...(r.review_images || [])],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function addImages(e) {
    const list = [...e.target.files];
    e.target.value = '';
    if (!list.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const f of list) added.push({ url: await uploadFile(f, 'reviews') });
      setEditing((cur) => ({ ...cur, images: [...cur.images, ...added] }));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setBusy(false);
  }

  async function save(e) {
    e.preventDefault();
    if (!editing.rating) return setMsg({ type: 'error', text: 'กรุณาเลือกคะแนนดาว' });
    setBusy(true);
    try {
      const row = {
        name: editing.name.trim() || 'ไม่ระบุชื่อ',
        rating: editing.rating,
        message: editing.message.trim(),
        status: editing.status,
      };
      let id = editing.id;
      if (editing.isNew) {
        id = crypto.randomUUID();
        const { error } = await supabase.from('reviews').insert({ id, ...row });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reviews').update(row).eq('id', id);
        if (error) throw error;
      }

      const removed = editing.originalImages.filter((o) => !editing.images.some((i) => i.id === o.id));
      if (removed.length) {
        const { error } = await supabase.from('review_images').delete().in('id', removed.map((r) => r.id));
        if (error) throw error;
        removeByUrls(removed.map((r) => r.url));
      }
      const added = editing.images.filter((i) => !i.id);
      if (added.length) {
        const { error } = await supabase.from('review_images').insert(added.map((i) => ({ review_id: id, url: i.url })));
        if (error) throw error;
      }

      setEditing(null);
      setMsg({ type: 'ok', text: 'บันทึกรีวิวแล้ว' });
      load();
      onChanged();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setBusy(false);
  }

  async function toggleStatus(r) {
    await supabase.from('reviews').update({ status: r.status === 'visible' ? 'hidden' : 'visible' }).eq('id', r.id);
    load();
    onChanged();
  }

  async function remove(r) {
    if (!confirm(`ลบรีวิวของ "${r.name}" ใช่ไหม? รูปที่แนบจะถูกลบด้วย และกู้คืนไม่ได้`)) return;
    const urls = (r.review_images || []).map((i) => i.url);
    const { error } = await supabase.from('reviews').delete().eq('id', r.id);
    if (error) return setMsg({ type: 'error', text: error.message });
    removeByUrls(urls);
    setMsg({ type: 'ok', text: 'ลบรีวิวแล้ว' });
    load();
    onChanged();
  }

  return (
    <div>
      {msg && <div className={`msg ${msg.type}`} role="status">{msg.text}</div>}

      {editing && (
        <form className="panel" onSubmit={save}>
          <h2 style={{ marginBottom: '1rem' }}>{editing.isNew ? 'เพิ่มรีวิว' : 'แก้ไขรีวิว'}</h2>
          <div className="field">
            <label htmlFor="rv-name">ชื่อ</label>
            <input id="rv-name" type="text" maxLength={60} value={editing.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="field">
            <label>คะแนน</label>
            <StarsInput value={editing.rating} onChange={(rating) => set({ rating })} />
          </div>
          <div className="field">
            <label htmlFor="rv-msg">ข้อความ</label>
            <textarea id="rv-msg" maxLength={1000} value={editing.message} onChange={(e) => set({ message: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="rv-img">รูปแนบ</label>
            {editing.images.length > 0 && (
              <div className="thumbs" style={{ marginBottom: '0.6rem' }}>
                {editing.images.map((im, i) => (
                  <div className="thumb-wrap" key={im.id || im.url}>
                    <img src={im.url} alt={`รูปที่ ${i + 1}`} />
                    <button type="button" aria-label={`เอารูปที่ ${i + 1} ออก`} onClick={() => set({ images: editing.images.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <input id="rv-img" type="file" accept="image/*" multiple onChange={addImages} disabled={busy} />
          </div>
          <label className="check field">
            <input type="checkbox" checked={editing.status === 'visible'} onChange={(e) => set({ status: e.target.checked ? 'visible' : 'hidden' })} />
            แสดงในหน้าลูกค้า
          </label>
          <div className="row-actions">
            <button type="submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
            <button type="button" className="ghost" onClick={() => setEditing(null)}>ยกเลิก</button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <input type="text" placeholder="ค้นหารีวิว (ชื่อ ข้อความ)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหารีวิว" />
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} aria-label="กรองตามดาว">
          <option value="all">ทุกคะแนน</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ดาว</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="กรองตามสถานะ">
          <option value="all">ทุกสถานะ</option>
          <option value="visible">แสดงอยู่</option>
          <option value="hidden">ซ่อนอยู่</option>
        </select>
        <button onClick={() => { setMsg(null); setEditing(blank()); }}>เพิ่มรีวิว</button>
      </div>

      <p className="hint" style={{ marginBottom: '0.75rem' }}>พบ {filtered.length} จาก {items.length} รีวิว</p>

      <div className="list">
        {filtered.length === 0 && <p className="empty">ไม่พบรีวิว</p>}
        {filtered.map((r) => (
          <article className="item" key={r.id}>
            <header>
              <span className="who">{r.name}</span>
              <span style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <StarsView value={r.rating} />
                <span className={`badge ${r.status === 'visible' ? '' : 'off'}`}>{r.status === 'visible' ? 'แสดงอยู่' : 'ซ่อนอยู่'}</span>
              </span>
            </header>
            <p className="when">{fmt(r.created_at)}</p>
            {r.message && <p className="body">{r.message}</p>}
            {r.review_images?.length > 0 && (
              <div className="thumbs">
                {r.review_images.map((im) => (
                  <a key={im.id} href={im.url} target="_blank" rel="noreferrer"><img src={im.url} alt="รูปแนบรีวิว" loading="lazy" /></a>
                ))}
              </div>
            )}
            <div className="row-actions">
              <button className="small" onClick={() => startEdit(r)}>แก้ไข</button>
              <button className="small ghost" onClick={() => toggleStatus(r)}>{r.status === 'visible' ? 'ซ่อน' : 'แสดง'}</button>
              <button className="small danger" onClick={() => remove(r)}>ลบ</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
