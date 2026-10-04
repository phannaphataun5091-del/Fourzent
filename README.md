# Fourzent

เว็บรีวิวและเครดิต — Next.js + Supabase

## เริ่มใช้งาน
1. สร้างโปรเจกต์ที่ supabase.com แล้วเปิด SQL Editor รันไฟล์ `supabase/schema.sql` ทั้งไฟล์
2. Authentication > Users > Add user สร้างบัญชีแอดมิน (อีเมล + รหัสผ่าน)
   และปิดการสมัครสมาชิกเอง: Authentication > Sign In / Providers > ปิด "Allow new users to sign up"
3. รันใน SQL Editor เพื่อให้บัญชีนั้นเป็นแอดมิน:
   `insert into public.admins (user_id) select id from auth.users where email = 'อีเมลแอดมิน';`
4. คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ Project URL และ anon key (Project Settings > API)
5. `npm install` แล้ว `npm run dev`
   - หน้าลูกค้า: http://localhost:3000/review
   - หน้าแอดมิน: http://localhost:3000/admin
6. ขึ้นเว็บจริง: อัปโหลดโปรเจกต์ขึ้น GitHub แล้ว import เข้า Vercel ใส่ environment variables ชุดเดียวกับข้อ 4

## ข้อจำกัดของลูกค้า (บังคับด้วย RLS ในฐานข้อมูล)
ดูรีวิว/เครดิตได้, ส่งรีวิวใหม่ได้, แนบรูปได้เฉพาะรีวิวที่เพิ่งส่งใน 10 นาที
แก้ไข/ลบไม่ได้ และเข้าแอดมินไม่ได้
