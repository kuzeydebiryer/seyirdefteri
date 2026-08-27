import { useRef } from 'react'

// Yatay kaydırmalı şeritler (poster akışları) mobilde parmakla kaydırılabiliyor
// ama masaüstünde fare tekerleği yatay kaydırmayı desteklemiyor genelde —
// kullanıcı sıkışıp kalıyordu. Bu sarmalayıcı, masaüstünde görünen sol/sağ
// ok butonları ekliyor (mobilde dokunma zaten çalıştığı için oklar
// `hidden sm:flex` ile sadece geniş ekranlarda beliriyor).
export default function YatayKaydirma({ children }) {
  const kapsayiciRef = useRef(null)

  function kaydir(yon) {
    kapsayiciRef.current?.scrollBy({ left: yon * 280, behavior: 'smooth' })
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => kaydir(-1)}
        aria-label="Sola kaydır"
        className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-murekkep/80 p-1.5 text-kagit opacity-0 transition group-hover:opacity-100 sm:flex"
      >
        ‹
      </button>
      <div ref={kapsayiciRef} className="flex gap-3 overflow-x-auto pb-1 scroll-smooth">
        {children}
      </div>
      <button
        type="button"
        onClick={() => kaydir(1)}
        aria-label="Sağa kaydır"
        className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-murekkep/80 p-1.5 text-kagit opacity-0 transition group-hover:opacity-100 sm:flex"
      >
        ›
      </button>
    </div>
  )
}
