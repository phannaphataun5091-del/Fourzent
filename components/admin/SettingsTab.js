'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile, removeByUrls } from '../../lib/media';

function MediaField({ id, label, kind, url, onUpload, onClear, busy }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="media-row">
        {url && kind === 'image' && <img src={url} alt="" />}
        {url && kind === 'audio' && <audio src={url} controls preload="none" />}
        <input id={id} type="file" accept={kind === 'audio' ? 'audio/*' : 'image/*'} onChange={onUpload} disabled={busy} />
        {url && <button type="button" className="ghost small" onClick={onClear}>เอาออก</button>}
      </div>
    </div>
  );
}

export default function SettingsTab() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(null); // ค่าที่บันทึกล่าสุด ใช้เทียบเพื่อลบไฟล์เก่า
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      setS(data);
      setSaved(data);
    });
  }, []);

  if (!s) return <p className="empty">กำลังโหลด…</p>;

  const set = (patch) => setS((cur) => ({ ...cur, ...patch }));

  const contacts = Array.isArray(s.contacts) ? s.contacts : [];
  const setContact = (i, patch) => set({ contacts: contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const addContact = () => set({ contacts: [...contacts, { label: '', url: '' }] });
  const removeContact = (i) => set({ contacts: contacts.filter((_, j) => j !== i) });
  const moveContact = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= contacts.length) return;
    const a = [...contacts];
    [a[i], a[j]] = [a[j], a[i]];
    set({ contacts: a });
  };

  const upload = (field, folder) => async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      set({ [field]: await uploadFile(f, folder) });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setBusy(false);
  };

  async function save(e) {
    e.preventDefault();
    const cleaned = contacts
      .map((c) => ({ label: (c.label || '').trim(), url: (c.url || '').trim() }))
      .filter((c) => c.label && c.url);
    if (cleaned.some((c) => !/^(https?:\/\/|tel:|mailto:)/i.test(c.url))) {
      return setMsg({ type: 'error', text: 'ลิงก์ช่องทางติดต่อต้องขึ้นต้นด้วย https:// หรือ tel: หรือ mailto:' });
    }
    setBusy(true);
    const row = {
      site_name: s.site_name.trim() || 'Fourzent',
      tagline: s.tagline || '',
      cover_url: s.cover_url || null,
      gif_url: s.gif_url || null,
      music_url: s.music_url || null,
      music_title: s.music_title || '',
      accent_color: s.accent_color || '#2F80ED',
      reviews_open: s.reviews_open,
      footer_text: s.footer_text || '',
      contacts: cleaned,
    };
    const { error } = await supabase.from('site_settings').update(row).eq('id', 1);
    setBusy(false);
    if (error) return setMsg({ type: 'error', text: error.message });

    const stale = ['cover_url', 'gif_url', 'music_url'].map((k) => (saved[k] && saved[k] !== row[k] ? saved[k] : null));
    removeByUrls(stale);
    setSaved({ ...s, ...row });
    set({ contacts: cleaned });
    setMsg({ type: 'ok', text: 'บันทึกการตั้งค่าแล้ว' });
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pw.length < 8) return setPwMsg({ type: 'error', text: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' });
    if (pw !== pw2) return setPwMsg({ type: 'error', text: 'รหัสผ่านสองช่องไม่ตรงกัน' });
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setPwMsg({ type: 'error', text: error.message });
    setPw('');
    setPw2('');
    setPwMsg({ type: 'ok', text: 'เปลี่ยนรหัสผ่านแล้ว' });
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <form className="card" onSubmit={save}>
        <h2 style={{ marginBottom: '1rem' }}>ตั้งค่าเว็บ</h2>
        {msg && <div className={`msg ${msg.type}`} role="status">{msg.text}</div>}

        <div className="field">
          <label htmlFor="s-name">ชื่อเว็บ</label>
          <input id="s-name" type="text" value={s.site_name || ''} onChange={(e) => set({ site_name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="s-tag">คำอธิบายใต้ชื่อ</label>
          <input id="s-tag" type="text" value={s.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} />
        </div>

        <MediaField id="s-cover" label="รูปปก" kind="image" url={s.cover_url} busy={busy}
          onUpload={upload('cover_url', 'site')} onClear={() => set({ cover_url: '' })} />
        <MediaField id="s-gif" label="GIF ข้างชื่อเว็บ" kind="image" url={s.gif_url} busy={busy}
          onUpload={upload('gif_url', 'site')} onClear={() => set({ gif_url: '' })} />
        <MediaField id="s-music" label="เพลงบนเว็บ" kind="audio" url={s.music_url} busy={busy}
          onUpload={upload('music_url', 'site')} onClear={() => set({ music_url: '', music_title: '' })} />

        {s.music_url && (
          <div className="field">
            <label htmlFor="s-mtitle">ชื่อเพลงที่แสดง</label>
            <input id="s-mtitle" type="text" value={s.music_title || ''} onChange={(e) => set({ music_title: e.target.value })} />
          </div>
        )}

        <div className="field">
          <label htmlFor="s-accent">สีหลักของเว็บ</label>
          <input id="s-accent" type="color" value={s.accent_color || '#2F80ED'} onChange={(e) => set({ accent_color: e.target.value })} style={{ width: '4rem', height: '2.5rem', border: 0, background: 'none', padding: 0 }} />
        </div>
        <div className="field">
          <label htmlFor="s-foot">ข้อความท้ายเว็บ</label>
          <input id="s-foot" type="text" value={s.footer_text || ''} onChange={(e) => set({ footer_text: e.target.value })} />
        </div>
        <div className="field">
          <label>ช่องทางติดต่อ</label>
          {contacts.map((c, i) => (
            <div className="contact-row" key={i}>
              <input type="text" placeholder="ชื่อปุ่ม เช่น LINE" aria-label={`ชื่อช่องทางที่ ${i + 1}`}
                value={c.label || ''} onChange={(e) => setContact(i, { label: e.target.value })} />
              <input type="text" placeholder="ลิงก์ เช่น https://line.me/ti/p/xxxx" aria-label={`ลิงก์ช่องทางที่ ${i + 1}`}
                value={c.url || ''} onChange={(e) => setContact(i, { url: e.target.value })} />
              <div className="row-actions" style={{ marginTop: 0 }}>
                <button type="button" className="ghost small" aria-label="เลื่อนขึ้น" onClick={() => moveContact(i, -1)}>↑</button>
                <button type="button" className="ghost small" aria-label="เลื่อนลง" onClick={() => moveContact(i, 1)}>↓</button>
                <button type="button" className="danger small" onClick={() => removeContact(i)}>ลบ</button>
              </div>
            </div>
          ))}
          <button type="button" className="ghost small" onClick={addContact}>เพิ่มช่องทางติดต่อ</button>
          <p className="hint" style={{ marginTop: '0.5rem' }}>ลิงก์ขึ้นต้นด้วย https:// หรือ tel:เบอร์โทร หรือ mailto:อีเมล</p>
        </div>
        <label className="check field">
          <input type="checkbox" checked={!!s.reviews_open} onChange={(e) => set({ reviews_open: e.target.checked })} />
          เปิดรับรีวิวใหม่จากลูกค้า
        </label>

        <button type="submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}</button>
      </form>

      <form className="card" onSubmit={changePassword}>
        <h2 style={{ marginBottom: '1rem' }}>เปลี่ยนรหัสผ่านแอดมิน</h2>
        {pwMsg && <div className={`msg ${pwMsg.type}`} role="status">{pwMsg.text}</div>}
        <div className="field">
          <label htmlFor="p1">รหัสผ่านใหม่</label>
          <input id="p1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p2">ยืนยันรหัสผ่านใหม่</label>
          <input id="p2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <button type="submit">เปลี่ยนรหัสผ่าน</button>
      </form>
    </div>
  );
}
