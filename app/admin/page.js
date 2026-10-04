'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ReviewsTab from '../../components/admin/ReviewsTab';
import SettingsTab from '../../components/admin/SettingsTab';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    setBusy(false);
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h2 style={{ marginBottom: '1rem' }}>เข้าสู่ระบบแอดมิน</h2>
      {error && <div className="msg error" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="a-email">อีเมล</label>
        <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="a-pass">รหัสผ่าน</label>
        <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button type="submit" disabled={busy} style={{ width: '100%' }}>
        {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('reviews');
  const [stats, setStats] = useState({ reviews: 0, hidden: 0, average: 0 });

  const loadStats = useCallback(async () => {
    const r = await supabase.from('reviews').select('rating,status');
    const rows = r.data || [];
    const visible = rows.filter((x) => x.status === 'visible');
    setStats({
      reviews: rows.length,
      hidden: rows.length - visible.length,
      average: visible.length ? visible.reduce((s, x) => s + x.rating, 0) / visible.length : 0,
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="wrap">
      <div className="admin-top">
        <h1 style={{ fontSize: '1.6rem' }}>จัดการ Fourzent</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a className="btn ghost" href="/review" style={{ textDecoration: 'none', border: '1.5px solid var(--line)', background: 'transparent', color: 'var(--ink)' }}>ดูหน้าลูกค้า</a>
          <button className="ghost" onClick={onLogout}>ออกจากระบบ</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><strong>{stats.reviews}</strong><span>รีวิวทั้งหมด</span></div>
        <div className="stat"><strong>{stats.average ? stats.average.toFixed(1) : '-'}</strong><span>คะแนนเฉลี่ย</span></div>
        <div className="stat"><strong>{stats.hidden}</strong><span>รีวิวที่ซ่อนอยู่</span></div>
      </div>

      <div className="tabs" role="tablist">
        {[['reviews', 'รีวิว'], ['settings', 'ตั้งค่าเว็บ']].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'reviews' && <ReviewsTab onChanged={loadStats} />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState(undefined); // undefined = กำลังตรวจ
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  const logout = () => supabase.auth.signOut();

  if (session === undefined) return <div className="wrap"><p className="empty">กำลังโหลด…</p></div>;
  if (!session) return <Login />;
  if (isAdmin === null) return <div className="wrap"><p className="empty">กำลังตรวจสิทธิ์…</p></div>;
  if (!isAdmin) {
    return (
      <div className="card login">
        <h2>บัญชีนี้ไม่มีสิทธิ์แอดมิน</h2>
        <p className="hint" style={{ margin: '0.5rem 0 1rem' }}>เพิ่มบัญชีนี้ในตาราง admins ก่อน แล้วเข้าสู่ระบบใหม่</p>
        <button onClick={logout}>ออกจากระบบ</button>
      </div>
    );
  }
  return <Dashboard onLogout={logout} />;
}
