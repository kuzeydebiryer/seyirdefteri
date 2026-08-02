import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { sanatEseriAra, rastgeleEserGetir } from '../utils/sanatEserleri.js'
import { eseriKoleksiyonaEkle, eseriKoleksiyondanCikar, kullaniciKoleksiyonEserIdleriGetir } from '../utils/sanatKoleksiyonu.js'

function EserKarti({ eser, kaydedildiMi, onKoleksiyonDegistir }) {
  return (
    <div>
      <a href={eser.sourceUrl} target="_blank" rel="noreferrer" className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
          <img src={eser.imageUrl} alt={eser.title} loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute bottom-0 right-0 rounded-tl-sm bg-murekkep/80 px-1 py-0.5 text-[9px] text-kagit">
            {eser.kaynakAdi}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-murekkep">{eser.title || 'İsimsiz'}</p>
        <p className="truncate text-[11px] text-kraft">
          {eser.artistDisplayName || 'Bilinmeyen sanatçı'}
          {eser.objectDate && ` · ${eser.objectDate}`}
        </p>
      </a>
      {onKoleksiyonDegistir && (
        <button
          onClick={() => onKoleksiyonDegistir(eser)}
          className={`mt-1 w-full rounded-sm px-1.5 py-1 text-[10px] ring-1 ${
            kaydedildiMi ? 'bg-muhur text-kagit ring-muhur' : 'bg-kagit text-kraft ring-cizgi hover:text-murekkep'
          }`}
        >
          {kaydedildiMi ? '❤️ Koleksiyonumda' : '🤍 Koleksiyona Ekle'}
        </button>
      )}
    </div>
  )
}

// Müze/Sergi kategorisini zenginleştirmek için The Met + Art Institute of
// Chicago'nun açık erişim koleksiyonlarından (anahtar gerektirmez, CORS açık)
// rastgele bir "Günün Eseri" ve arama imkânı sunar. Beğenilen eserler kişisel
// bir "Sanat Koleksiyonu"na kaydedilebiliyor — bkz. Profil sayfası.
export default function SanatEserleriKesfet() {
  const { kullanici } = useAuth()
  const [gununEseri, setGununEseri] = useState(null)
  const [gununEseriYukleniyor, setGununEseriYukleniyor] = useState(true)
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [aramaYapildi, setAramaYapildi] = useState(false)
  const [kaydedilenIdler, setKaydedilenIdler] = useState(new Set())

  async function gununEseriniYenile() {
    setGununEseriYukleniyor(true)
    const eser = await rastgeleEserGetir()
    setGununEseri(eser)
    setGununEseriYukleniyor(false)
  }

  useEffect(() => {
    gununEseriniYenile()
  }, [])

  useEffect(() => {
    if (!kullanici) {
      setKaydedilenIdler(new Set())
      return
    }
    kullaniciKoleksiyonEserIdleriGetir(kullanici.uid).then(setKaydedilenIdler)
  }, [kullanici])

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    setAramaYukleniyor(true)
    setAramaYapildi(true)
    try {
      const liste = await sanatEseriAra(arama)
      setSonuclar(liste)
    } finally {
      setAramaYukleniyor(false)
    }
  }

  async function koleksiyonDegistir(eser) {
    if (!kullanici) return
    const kayitliMi = kaydedilenIdler.has(eser.id)
    setKaydedilenIdler((onceki) => {
      const yeni = new Set(onceki)
      kayitliMi ? yeni.delete(eser.id) : yeni.add(eser.id)
      return yeni
    })
    if (kayitliMi) {
      await eseriKoleksiyondanCikar(kullanici.uid, eser.id)
    } else {
      await eseriKoleksiyonaEkle(kullanici, eser)
    }
  }

  return (
    <div className="mb-10">
      <h2 className="font-baslik text-lg text-murekkep mb-1">🖼️ Sanat Eserleri Keşfet</h2>
      <p className="mb-3 text-xs text-kraft">The Met ve Art Institute of Chicago'nun açık erişim koleksiyonlarından.</p>

      {!gununEseriYukleniyor && gununEseri && (
        <div className="mb-4 flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <a href={gununEseri.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={gununEseri.imageUrl} alt={gununEseri.title} className="h-28 w-20 rounded-sm object-cover ring-1 ring-cizgi" />
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-gise">Günün Eseri · {gununEseri.kaynakAdi}</p>
            <a
              href={gununEseri.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate font-baslik text-sm text-murekkep hover:underline"
            >
              {gununEseri.title || 'İsimsiz'}
            </a>
            <p className="truncate text-xs text-kraft">
              {gununEseri.artistDisplayName || 'Bilinmeyen sanatçı'}
              {gununEseri.objectDate && ` · ${gununEseri.objectDate}`}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button onClick={gununEseriniYenile} className="text-[11px] text-kraft hover:text-deniz hover:underline">
                🔄 Başka Bir Eser Göster
              </button>
              {kullanici && (
                <button onClick={() => koleksiyonDegistir(gununEseri)} className="text-[11px] text-kraft hover:text-muhur">
                  {kaydedilenIdler.has(gununEseri.id) ? '❤️ Koleksiyonumda' : '🤍 Koleksiyona Ekle'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={ara} className="flex gap-2">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Sanatçı, dönem, konu ara... (ör. Van Gogh, Ottoman, portrait)"
          className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <button type="submit" disabled={aramaYukleniyor} className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit disabled:opacity-40">
          {aramaYukleniyor ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      {aramaYapildi && !aramaYukleniyor && sonuclar.length === 0 && <p className="mt-2 text-sm text-kraft">Sonuç bulunamadı.</p>}

      {sonuclar.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {sonuclar.map((eser) => (
            <EserKarti
              key={eser.id}
              eser={eser}
              kaydedildiMi={kaydedilenIdler.has(eser.id)}
              onKoleksiyonDegistir={kullanici ? koleksiyonDegistir : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
