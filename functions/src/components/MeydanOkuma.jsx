import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { meydanOkumaOner, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'

// Bu bir "takip sistemi" değil — kimin hangi meydan okumayı tamamladığını
// kaydetmiyoruz, sadece keşif/ilham için: birkaç hazır meydan okuma türünden
// biri rastgele seçilip ona uyan gerçek bir kitap öneriliyor.
export default function MeydanOkuma() {
  const navigate = useNavigate()
  const [durum, setDurum] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [inceleniyor, setInceleniyor] = useState(false)

  async function yenile() {
    setYukleniyor(true)
    const sonuc = await meydanOkumaOner()
    setDurum(sonuc)
    setYukleniyor(false)
  }

  useEffect(() => {
    yenile()
  }, [])

  async function incele() {
    if (!durum?.kitap) return
    setInceleniyor(true)
    try {
      const kaydedilen = await turkceKitaptanKaydet(durum.kitap)
      navigate(`/kitap/${kaydedilen.id}`)
    } finally {
      setInceleniyor(false)
    }
  }

  if (yukleniyor || !durum) return null

  return (
    <div className="mb-6 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <p className="text-[11px] uppercase tracking-widest text-gise">🎯 Meydan Okuma</p>
      <p className="mt-1 font-baslik text-base text-murekkep">{durum.meydanOkuma}</p>

      {durum.kitap ? (
        <>
          <p className="mt-2 text-sm text-murekkep">{durum.kitap.baslik}</p>
          <p className="text-xs text-kraft">
            {[durum.kitap.yazar, durum.kitap.sayfaSayisi && `${durum.kitap.sayfaSayisi} sayfa`].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={incele}
              disabled={inceleniyor}
              className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {inceleniyor ? 'Açılıyor...' : 'Bu Kitabı İncele →'}
            </button>
            <button onClick={yenile} className="text-[11px] text-kraft hover:text-deniz hover:underline">
              🔄 Başka Meydan Okuma
            </button>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-kraft">Uygun bir kitap bulunamadı, tekrar dene.</p>
      )}
    </div>
  )
}
