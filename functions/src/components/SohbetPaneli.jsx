import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { mesajGonder, mesajlariDinle } from '../utils/sohbet.js'

function tarihFormatla(tarih) {
  const ms = tarih?.toMillis?.()
  if (!ms) return ''
  return new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// Sayfa yapısını zorlamayacak şekilde tasarlandı: varsayılan kapalı, sabit
// yükseklikte kaydırmalı bir kutu — açıksa bile sayfanın geri kalanını
// aşağı itmiyor, kendi içinde büyümüyor. Canlı dinleme SADECE panel
// açıkken çalışıyor (kapanınca abonelik iptal ediliyor).
export default function SohbetPaneli({ konumId, baslik = '💬 Sohbet' }) {
  const { kullanici, profil } = useAuth()
  const [acik, setAcik] = useState(false)
  const [mesajlar, setMesajlar] = useState([])
  const [taslak, setTaslak] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const sonRef = useRef(null)

  useEffect(() => {
    if (!acik) return
    const iptalEt = mesajlariDinle(konumId, setMesajlar)
    return () => iptalEt()
  }, [acik, konumId])

  useEffect(() => {
    if (acik) sonRef.current?.scrollIntoView({ block: 'nearest' })
  }, [mesajlar, acik])

  async function gonder(e) {
    e.preventDefault()
    if (!taslak.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      await mesajGonder(konumId, kullanici, profil, taslak)
      setTaslak('')
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <div className="mb-8 rounded-sm ring-1 ring-cizgi">
      <button
        onClick={() => setAcik((a) => !a)}
        className="flex w-full items-center justify-between rounded-sm bg-kagitKoyu px-4 py-2 text-left"
      >
        <span className="font-baslik text-sm text-murekkep">{baslik}</span>
        <span className="text-xs text-kraft">{acik ? '▲ Gizle' : '▼ Göster'}</span>
      </button>

      {acik && (
        <div className="bg-kagit p-3">
          <div className="mb-2 h-56 space-y-2 overflow-y-auto rounded-sm bg-kagitKoyu p-2">
            {mesajlar.length === 0 && <p className="text-xs text-kraft">Henüz mesaj yok, ilk mesajı sen yaz.</p>}
            {mesajlar.map((m) => (
              <div key={m.id} className="text-xs">
                <span className="font-medium text-murekkep">{m.kullaniciAdi}</span>{' '}
                <span className="text-kraft">{tarihFormatla(m.tarih)}</span>
                <p className="text-murekkep">{m.mesaj}</p>
              </div>
            ))}
            <div ref={sonRef} />
          </div>

          {kullanici ? (
            <form onSubmit={gonder} className="flex gap-2">
              <input
                type="text"
                value={taslak}
                onChange={(e) => setTaslak(e.target.value)}
                placeholder="Bir şeyler yaz..."
                maxLength={500}
                className="flex-1 rounded-sm bg-kagitKoyu px-3 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <button
                type="submit"
                disabled={gonderiliyor || !taslak.trim()}
                className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                Gönder
              </button>
            </form>
          ) : (
            <p className="text-xs text-kraft">Mesaj yazmak için giriş yap.</p>
          )}
        </div>
      )}
    </div>
  )
}
