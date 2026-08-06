import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gununKitabiGetir, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'
import { rastgeleEserGetir } from '../utils/sanatEserleri.js'

// Anasayfaya "bugün seni bekleyen" hissi katan küçük bir keşif kutusu.
// Kitap Dünyası'ndaki Günün Kitabı ve Sanat Eserleri Keşfet'teki Günün
// Eseri altyapısını olduğu gibi yeniden kullanıyor — her açılışta ikisinden
// biri rastgele seçiliyor, yeni bir veri kaynağı gerekmiyor.
export default function GunlukKesif() {
  const navigate = useNavigate()
  const [tur, setTur] = useState(null) // 'kitap' | 'eser'
  const [icerik, setIcerik] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aciliyor, setAciliyor] = useState(false)

  async function yenile(zorlaTur) {
    setYukleniyor(true)
    const secilenTur = zorlaTur || (Math.random() < 0.5 ? 'kitap' : 'eser')
    setTur(secilenTur)
    if (secilenTur === 'kitap') {
      const kitap = await gununKitabiGetir().catch(() => null)
      setIcerik(kitap)
    } else {
      const eser = await rastgeleEserGetir().catch(() => null)
      setIcerik(eser)
    }
    setYukleniyor(false)
  }

  useEffect(() => {
    yenile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function incele() {
    if (!icerik) return
    if (tur === 'eser') {
      window.open(icerik.sourceUrl, '_blank', 'noreferrer')
      return
    }
    setAciliyor(true)
    try {
      const kaydedilen = await turkceKitaptanKaydet(icerik)
      navigate(`/kitap/${kaydedilen.id}`)
    } finally {
      setAciliyor(false)
    }
  }

  if (yukleniyor || !icerik) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      {tur === 'eser' && icerik.imageUrl && (
        <img src={icerik.imageUrl} alt={icerik.title} className="h-20 w-16 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-widest text-gise">
          {tur === 'kitap' ? '📖 Günün Kitabı' : `🖼️ Günün Eseri · ${icerik.kaynakAdi}`}
        </p>
        {tur === 'kitap' ? (
          <>
            <p className="mt-1 truncate font-baslik text-base text-murekkep">{icerik.baslik}</p>
            <p className="truncate text-xs text-kraft">
              {[icerik.yazar, icerik.yayinevi, icerik.yil].filter(Boolean).join(' · ')}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 truncate font-baslik text-base text-murekkep">{icerik.title || 'İsimsiz'}</p>
            <p className="truncate text-xs text-kraft">
              {icerik.artistDisplayName || 'Bilinmeyen sanatçı'}
              {icerik.objectDate && ` · ${icerik.objectDate}`}
            </p>
          </>
        )}
        <div className="mt-2 flex items-center gap-3">
          <button onClick={incele} disabled={aciliyor} className="rounded-sm bg-muhur px-3 py-1 font-govde text-[11px] text-kagit disabled:opacity-40">
            {aciliyor ? 'Açılıyor...' : tur === 'kitap' ? 'İncele →' : 'Görüntüle →'}
          </button>
          <button onClick={() => yenile()} className="text-[11px] text-kraft hover:text-deniz hover:underline">
            🔀 Başka Bir Şey Göster
          </button>
        </div>
      </div>
    </div>
  )
}
