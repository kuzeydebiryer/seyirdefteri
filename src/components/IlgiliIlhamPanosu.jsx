import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ilhamlariEserIcinGetir, ilhamEkle } from '../utils/ilhamPanosu.js'
import InstagramGomulusu from './InstagramGomulusu.jsx'

// Film/Dizi/Kitap/Oyuncu sayfasına gömülü, o SAYFAYA ÖZEL İlham Panosu
// bölümü — genel panodaki gibi arayıp eser seçmeye gerek yok, zaten o
// eserin sayfasındasınız, sadece linki yapıştırıp eklemeniz yeterli.
export default function IlgiliIlhamPanosu({ tur, disId, baslik, posterUrl, kategori }) {
  const { kullanici, profil } = useAuth()
  const [ilhamlar, setIlhamlar] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [url, setUrl] = useState('')
  const [not_, setNot_] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  useEffect(() => {
    if (!disId) return
    // KRİTİK: sayfalar arası hızlı geçişte (SPA navigasyonu, tam sayfa
    // yenilemeden) eski sayfanın isteği yeni sayfadakinden GEÇ dönerse,
    // eski (yanlış) veriyle üzerine yazabiliyordu — "bir sayfadaki paylaşım
    // başka birinin sayfasında görünüyor" sorununun kök sebebi buydu.
    // Hem "iptal" bayrağıyla geç gelen yanıtı yok sayıyoruz, hem de tur/
    // disId değişir değişmez eski veriyi hemen temizliyoruz (bir anlığına
    // bile yanlış paylaşım görünmesin diye).
    let iptal = false
    setIlhamlar(null)
    ilhamlariEserIcinGetir(tur, disId).then((liste) => {
      if (!iptal) setIlhamlar(liste)
    })
    return () => {
      iptal = true
    }
  }, [tur, disId])

  async function ekleTiklandi(e) {
    e.preventDefault()
    if (!url.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      await ilhamEkle(kullanici, profil, {
        url: url.trim(),
        kategori,
        not: not_,
        iliskiliTur: tur,
        iliskiliDisId: disId,
        iliskiliBaslik: baslik,
        iliskiliPosterUrl: posterUrl,
      })
      setUrl('')
      setNot_('')
      setFormAcik(false)
      ilhamlariEserIcinGetir(tur, disId).then(setIlhamlar)
    } finally {
      setGonderiliyor(false)
    }
  }

  if (ilhamlar === null) return null
  if (ilhamlar.length === 0 && !kullanici) return null

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📌 İlham Panosu</h2>
        {kullanici && (
          <button onClick={() => setFormAcik((a) => !a)} className="text-xs text-deniz hover:underline">
            {formAcik ? 'Vazgeç' : '+ Instagram Paylaşımı Ekle'}
          </button>
        )}
      </div>

      {formAcik && (
        <form onSubmit={ekleTiklandi} className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://www.instagram.com/p/..."
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            value={not_}
            onChange={(e) => setNot_(e.target.value)}
            rows={2}
            placeholder="Neden paylaştın? (opsiyonel)"
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button
            type="submit"
            disabled={gonderiliyor}
            className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {gonderiliyor ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </form>
      )}

      {ilhamlar.length === 0 && <p className="text-sm text-kraft">Henüz bir paylaşım yok.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {ilhamlar.map((i) => (
          <div key={i.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <InstagramGomulusu url={i.url} paylasanAdi={i.paylasanAdi} />
            {i.not && <p className="mt-2 text-sm text-murekkep">{i.not}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
