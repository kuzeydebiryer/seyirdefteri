import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ILHAM_KATEGORILERI, ilhamEkle, ilhamlariGetir, ilhamlariSayfalanmisGetir, ilhamSil } from '../utils/ilhamPanosu.js'
import { ULKELER } from '../data/ulkeler.js'
import { konumGeocodeEt } from '../utils/konumGeocode.js'
import MedyaGomulusu from '../components/MedyaGomulusu.jsx'
import IliskiliEserRozeti from '../components/IliskiliEserRozeti.jsx'
import GeziRozeti from '../components/GeziRozeti.jsx'
import GeziBilgisiFormu from '../components/GeziBilgisiFormu.jsx'
import IlhamGeziHaritasi from '../components/IlhamGeziHaritasi.jsx'
import EserSecici from '../components/EserSecici.jsx'
import Avatar from '../components/Avatar.jsx'

const KATEGORI_IKONU = { Film: '🎬', Dizi: '📺', Kitap: '📖', Oyuncu: '🎭', Gezi: '🧳', Etkinlik: '🎟️', Sanat: '🎨' }
const SAYFA_BOYUTU = 20

export default function IlhamPanosu() {
  const { kullanici, profil } = useAuth()
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()
  const kategoriFiltre = aramaParametreleri.get('kategori') || ''
  const ulkeFiltre = aramaParametreleri.get('ulke') || ''
  const mekanFiltre = aramaParametreleri.get('mekan') || ''
  const kampanyaFiltre = aramaParametreleri.get('kampanya') || ''
  const geziAltFiltreAktif = kategoriFiltre === 'Gezi' && (ulkeFiltre || mekanFiltre || kampanyaFiltre)

  // Ana akış — sayfalanmış. "Daha Fazla Yükle" ile üstüne ekleniyor.
  const [ilhamlar, setIlhamlar] = useState(null)
  const [sonBelge, setSonBelge] = useState(null)
  const [dahaVarMi, setDahaVarMi] = useState(false)
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false)

  // Gezi haritası + ülke/mekan/kampanya alt filtreleri TÜM Gezi paylaşımlarını
  // görmek zorunda (aksi halde harita eksik ülke gösterir, alt filtre de
  // sadece o an yüklü sayfadaki paylaşımlarda arama yapar) — bu yüzden
  // sayfalamadan bağımsız, ayrı ve tam bir sorgu.
  const [geziTumIlhamlari, setGeziTumIlhamlari] = useState(null)

  const [formAcik, setFormAcik] = useState(false)
  const [url, setUrl] = useState('')
  const [kategori, setKategori] = useState('Film')
  const [iliskili, setIliskili] = useState(null)
  const [geziBilgi, setGeziBilgi] = useState({ ulkeKodu: '', konum: '', kampanya: '' })
  const [not_, setNot_] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  useEffect(() => {
    setIlhamlar(null)
    setSonBelge(null)
    ilhamlariSayfalanmisGetir(kategoriFiltre || undefined, SAYFA_BOYUTU).then(({ liste, sonBelge, dahaVarMi }) => {
      setIlhamlar(liste)
      setSonBelge(sonBelge)
      setDahaVarMi(dahaVarMi)
    })
  }, [kategoriFiltre])

  useEffect(() => {
    if (kategoriFiltre !== 'Gezi') {
      setGeziTumIlhamlari(null)
      return
    }
    ilhamlariGetir('Gezi').then(setGeziTumIlhamlari)
  }, [kategoriFiltre])

  async function dahaFazlaYukleTiklandi() {
    setDahaYukleniyor(true)
    try {
      const { liste, sonBelge: yeniSonBelge, dahaVarMi: yeniDahaVarMi } = await ilhamlariSayfalanmisGetir(
        kategoriFiltre || undefined,
        SAYFA_BOYUTU,
        sonBelge
      )
      setIlhamlar((mevcut) => [...mevcut, ...liste])
      setSonBelge(yeniSonBelge)
      setDahaVarMi(yeniDahaVarMi)
    } finally {
      setDahaYukleniyor(false)
    }
  }

  function kategoriFiltreSec(k) {
    const yeni = new URLSearchParams()
    if (k) yeni.set('kategori', k)
    setAramaParametreleri(yeni)
  }

  function geziAltFiltreSec(alan, deger) {
    const yeni = new URLSearchParams(aramaParametreleri)
    yeni.set('kategori', 'Gezi')
    yeni.set(alan, deger)
    setAramaParametreleri(yeni)
  }

  function geziAltFiltreTemizle() {
    const yeni = new URLSearchParams()
    yeni.set('kategori', 'Gezi')
    setAramaParametreleri(yeni)
  }

  async function ekleTiklandi(e) {
    e.preventDefault()
    if (!url.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      let geziAlanlari = {}
      if (kategori === 'Gezi') {
        const secilenUlke = ULKELER.find((u) => u.kod === geziBilgi.ulkeKodu)
        const konumBilgisi = await konumGeocodeEt(geziBilgi.konum, secilenUlke?.ad)
        geziAlanlari = {
          geziUlkeKodu: secilenUlke?.kod || '',
          geziUlkeAdi: secilenUlke?.ad || '',
          geziUlkeIso: secilenUlke?.isoNumeric || '',
          geziKonum: geziBilgi.konum || '',
          geziEnlem: konumBilgisi?.enlem ?? null,
          geziBoylem: konumBilgisi?.boylem ?? null,
          geziKampanya: geziBilgi.kampanya || '',
        }
      }

      await ilhamEkle(kullanici, profil, {
        url: url.trim(),
        kategori,
        not: not_,
        iliskiliTur: iliskili?.tur,
        iliskiliDisId: iliskili?.disId,
        iliskiliBaslik: iliskili?.baslik,
        iliskiliPosterUrl: iliskili?.posterUrl,
        iliskiliYil: iliskili?.yil,
        iliskiliAlt: iliskili?.altBaslik,
        ...geziAlanlari,
      })
      setUrl('')
      setNot_('')
      setIliskili(null)
      setGeziBilgi({ ulkeKodu: '', konum: '', kampanya: '' })
      setFormAcik(false)
      const { liste, sonBelge: yeniSonBelge, dahaVarMi: yeniDahaVarMi } = await ilhamlariSayfalanmisGetir(kategoriFiltre || undefined, SAYFA_BOYUTU)
      setIlhamlar(liste)
      setSonBelge(yeniSonBelge)
      setDahaVarMi(yeniDahaVarMi)
      if (kategoriFiltre === 'Gezi') ilhamlariGetir('Gezi').then(setGeziTumIlhamlari)
    } finally {
      setGonderiliyor(false)
    }
  }

  async function silTiklandi(id) {
    if (!window.confirm('Bu paylaşımı kaldırmak istediğine emin misin?')) return
    await ilhamSil(id)
    setIlhamlar((liste) => liste.filter((i) => i.id !== id))
    setGeziTumIlhamlari((liste) => liste?.filter((i) => i.id !== id) ?? liste)
  }

  const geziAltFiltreliIlhamlar =
    geziTumIlhamlari?.filter((i) => {
      if (ulkeFiltre && i.geziUlkeKodu !== ulkeFiltre) return false
      if (mekanFiltre && i.geziKonum !== mekanFiltre) return false
      if (kampanyaFiltre && i.geziKampanya !== kampanyaFiltre) return false
      return true
    }) || []

  const gosterilecekIlhamlar = geziAltFiltreAktif ? geziAltFiltreliIlhamlar : ilhamlar
  const yukleniyorMu = geziAltFiltreAktif ? geziTumIlhamlari === null : ilhamlar === null

  return (
    <div>
      <Link to="/" className="text-xs text-kraft hover:text-deniz">
        ← Anasayfa
      </Link>
      <div className="mt-1 mb-1 flex items-center justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">📌 Seyir Panosu</h1>
        {kullanici && (
          <button
            onClick={() => setFormAcik((a) => !a)}
            className="rounded-full bg-gise px-3 py-1.5 font-govde text-xs text-kagit"
          >
            {formAcik ? 'Vazgeç' : '+ Paylaş'}
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-kraft">
        Sinema, kitap, gezi ve kültür üzerine sosyal medyada gördüğünüz ilginç paylaşımları buraya bırakın.
      </p>

      {formAcik && (
        <form onSubmit={ekleTiklandi} className="mb-6 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Instagram, YouTube veya X Linki</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="Instagram, YouTube veya X linki..."
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {ILHAM_KATEGORILERI.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKategori(k)
                    setIliskili(null)
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
                    kategori === k ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi'
                  }`}
                >
                  {KATEGORI_IKONU[k]} {k}
                </button>
              ))}
            </div>
          </div>
          <EserSecici kategori={kategori} secili={iliskili} onSecim={setIliskili} onTemizle={() => setIliskili(null)} />
          {kategori === 'Gezi' && <GeziBilgisiFormu deger={geziBilgi} onDegisim={setGeziBilgi} />}
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Neden paylaştın? (opsiyonel)</label>
            <textarea
              value={not_}
              onChange={(e) => setNot_(e.target.value)}
              rows={2}
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <button
            type="submit"
            disabled={gonderiliyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {gonderiliyor ? 'Ekleniyor...' : 'Panoya Ekle'}
          </button>
        </form>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => kategoriFiltreSec('')}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            kategoriFiltre === '' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          Tümü
        </button>
        {ILHAM_KATEGORILERI.map((k) => (
          <button
            key={k}
            onClick={() => kategoriFiltreSec(k)}
            className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
              kategoriFiltre === k ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
            }`}
          >
            {KATEGORI_IKONU[k]} {k}
          </button>
        ))}
      </div>

      {kategoriFiltre === 'Gezi' && geziTumIlhamlari !== null && (
        <IlhamGeziHaritasi
          ilhamlar={geziTumIlhamlari}
          onUlkeTikla={(kod) => geziAltFiltreSec('ulke', kod)}
          onMekanTikla={(mekan) => geziAltFiltreSec('mekan', mekan)}
        />
      )}

      {(ulkeFiltre || mekanFiltre || kampanyaFiltre) && (
        <div className="mb-4 flex items-center gap-2 text-xs text-kraft">
          <span>
            Filtre:{' '}
            {ulkeFiltre && (ULKELER.find((u) => u.kod === ulkeFiltre)?.ad || ulkeFiltre)}
            {mekanFiltre && ` 📍 ${mekanFiltre}`}
            {kampanyaFiltre && ` 🏷️ ${kampanyaFiltre}`}
          </span>
          <button onClick={geziAltFiltreTemizle} className="text-deniz hover:underline">
            Temizle ✕
          </button>
        </div>
      )}

      {yukleniyorMu && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyorMu && gosterilecekIlhamlar?.length === 0 && (
        <p className="text-sm text-kraft">
          {geziAltFiltreAktif ? 'Bu filtreye uyan bir paylaşım yok.' : 'Henüz bir paylaşım yok — ilkini sen ekle.'}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {gosterilecekIlhamlar?.map((i) => (
          <div key={i.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gise">
                {KATEGORI_IKONU[i.kategori]} {i.kategori}
              </span>
              {kullanici?.uid === i.paylasanId && (
                <button onClick={() => silTiklandi(i.id)} className="text-[11px] text-kraft hover:text-muhur">
                  Sil
                </button>
              )}
            </div>
            <IliskiliEserRozeti ilham={i} />
            <GeziRozeti ilham={i} />
            <MedyaGomulusu url={i.url} kompakt />
            {i.not && <p className="mt-2 text-sm text-murekkep">{i.not}</p>}
            <div className="mt-2 flex items-center gap-1.5">
              <Avatar adSoyad={i.paylasanAdi} boyut="h-5 w-5" />
              <span className="text-xs text-kraft">{i.paylasanAdi} paylaştı</span>
            </div>
          </div>
        ))}
      </div>

      {!geziAltFiltreAktif && dahaVarMi && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={dahaFazlaYukleTiklandi}
            disabled={dahaYukleniyor}
            className="rounded-full bg-kagitKoyu px-4 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
          >
            {dahaYukleniyor ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
          </button>
        </div>
      )}
    </div>
  )
}
