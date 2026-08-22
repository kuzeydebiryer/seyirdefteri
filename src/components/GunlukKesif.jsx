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
  // Müze API'lerinden gelen eserlerin bir kısmının image_id'si var ama
  // gerçek IIIF görseli 403/404 dönüyor (haklar/arşiv tutarsızlığı) —
  // bu yüzden ara sıra kırık resim ikonu çıkıyordu. Görsel yüklenemezse
  // sessizce başka bir eser deniyoruz; birkaç denemeden sonra pes edip
  // görselsiz gösteriyoruz.
  const [resimDenemeSayaci, setResimDenemeSayaci] = useState(0)

  async function eserGetirVeAyarla() {
    const eser = await rastgeleEserGetir().catch(() => null)
    setIcerik(eser)
  }

  async function yenile(zorlaTur) {
    setYukleniyor(true)
    setResimDenemeSayaci(0)
    const secilenTur = zorlaTur || (Math.random() < 0.5 ? 'kitap' : 'eser')
    setTur(secilenTur)
    if (secilenTur === 'kitap') {
      const kitap = await gununKitabiGetir().catch(() => null)
      setIcerik(kitap)
    } else {
      await eserGetirVeAyarla()
    }
    setYukleniyor(false)
  }

  function resimYuklenemedi() {
    setResimDenemeSayaci((n) => {
      const yeni = n + 1
      if (yeni > 2) {
        // 3 denemeden sonra pes et, görsel olmadan göstermeye devam et
        setIcerik((i) => (i ? { ...i, imageUrl: '' } : i))
      } else {
        eserGetirVeAyarla()
      }
      return yeni
    })
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
    <div className="mb-10 flex items-center gap-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      {tur === 'eser' &&
        (icerik.imageUrl ? (
          <img
            src={icerik.imageUrl}
            alt={icerik.title}
            onError={resimYuklenemedi}
            className="h-20 w-16 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
          />
        ) : (
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-sm bg-kagit text-xl ring-1 ring-cizgi">🖼️</div>
        ))}
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
