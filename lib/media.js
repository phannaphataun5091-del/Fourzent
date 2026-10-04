import { supabase } from './supabase';

const BUCKET = 'media';
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadFile(file, folder) {
  if (file.size > MAX_BYTES) throw new Error('ไฟล์ใหญ่เกิน 10 MB');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ลบไฟล์ออกจากที่เก็บไฟล์ (เฉพาะแอดมิน)
export async function removeByUrls(urls) {
  const marker = `/${BUCKET}/`;
  const paths = urls
    .filter(Boolean)
    .map((u) => {
      const i = u.indexOf(marker);
      return i < 0 ? null : decodeURIComponent(u.slice(i + marker.length).split('?')[0]);
    })
    .filter(Boolean);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}
