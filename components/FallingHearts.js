'use client';

import { useEffect, useState } from 'react';

export default function FallingHearts({ count = 18 }) {
  const [hearts, setHearts] = useState([]);

  // สุ่มค่าหลัง mount เพื่อไม่ให้ค่าบนเซิร์ฟเวอร์กับเบราว์เซอร์ไม่ตรงกัน
  useEffect(() => {
    setHearts(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 12 + Math.random() * 16,
        duration: 9 + Math.random() * 9,
        delay: -Math.random() * 18,
        drift: Math.random() * 60 - 30,
        opacity: 0.25 + Math.random() * 0.35,
      }))
    );
  }, [count]);

  return (
    <div className="hearts" aria-hidden="true">
      {hearts.map((h) => (
        <span
          key={h.id}
          style={{
            left: `${h.left}%`,
            fontSize: `${h.size}px`,
            opacity: h.opacity,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
            '--drift': `${h.drift}px`,
          }}
        >
          ♡
        </span>
      ))}
    </div>
  );
}
