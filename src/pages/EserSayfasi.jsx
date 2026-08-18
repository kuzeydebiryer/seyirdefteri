import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEserGonderileri, useKitapIncelemeleri } from '../hooks/useEser.js'
import { useAuth } from '../context/AuthContext.jsx'
import { favoriEkle, favoriKaldir } from '../utils/favori.js'
import { favoriMi } from '../hooks/useFavoriler.js'
import {
  izlenecekEkle,
  izlenecekKaldir,
  izlenecekGetir,
  toplamSayfaTamamla,
  okumayaBasla,
  ilerlemeGuncelle,
  baslangicTarihiTamamla,
  dizideIlerlemeGuncelle,
  baslangicTarihiniDuzelt,
  izlenecekPosterleriniSenkronizeEt,
} from '../utils/izlenecek.js'
import { eserPuanla, eserPuanindaGunlukVarIsaretle } from '../utils/eserPuani.js'
import { gunlukKaydiEkle, gunlukKaydiGuncelle, gunlukKaydiAyniGunGetir } from '../utils/gunluk.js'
import { tavsiyePosterleriniSenkronizeEt } from '../utils/tavsiye.js'
import YildizPuan from '../components/YildizPuan.jsx'
import YildizSecici from '../components/YildizSecici.jsx'
import Avatar from '../components/Avatar.jsx'
import FilmMuzigiWidget from '../components/FilmMuzigiWidget.jsx'
import GonderiIcerik from '../components/GonderiIcerik.jsx'
import { kitapGetir, kitapGuncelle, kitapElleEkle, kitapAramaSonucundanKaydet } from '../utils/kitapKatalog.js'
import { turkceKitapAra, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'
import { alintiEkle, alintiBegenDegistir, alintiSil, kitapAlintilariGetir } from '../utils/alinti.js'
import { useKisiselListeler } from '../hooks/useKisiselListeler.js'
import { ogeEkle as listeyeOgeEkle, esereAitListeleriGetir } from '../utils/kisiselListe.js'
import { filmOscarBilgisiGetir } from '../utils/oscar.js'
import OscarHeykelIkon from '../components/ikonlar/OscarHeykelIkon.jsx'
import { ilgiliEserEkle, ilgiliEserleriGetir, ilgiliEserSil } from '../utils/ilgiliEser.js'
import { kitaptanFilmOner, filmdenKitapOner, filmTriviaGetir, paraFormatla } from '../utils/wikidata.js'
import { eserYorumlariGetir, eserYorumEkle, yorumSil } from '../utils/yorum.js'
import AlintiKarti from '../components/AlintiKarti.jsx'
import EserKarti from '../components/EserKarti.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY
const TMDB_SAGLAYICI_LOGO = 'https://image.tmdb.org/t/p/w92'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

// Okuma başlangıcından bu yana geçen gün sayısı ve günlük ortalama sayfa
// hızı. Başladığı gün "1. gün" sayılır (0 değil) — kullanıcıya daha sezgisel
// geliyor ("bugün başladım" iken "0 gündür okuyorsun" tuhaf kaçardı).
function okumaHiziHesapla(baslangicTarihi, suankiSayfa) {
  if (!baslangicTarihi?.toMillis) return null
  const gunSayisi = Math.max(1, Math.floor((Date.now() - baslangicTarihi.toMillis()) / 86400000) + 1)
  const gunlukOrtalama = suankiSayfa > 0 ? Math.round((suankiSayfa / gunSayisi) * 10) / 10 : 0
  return { gunSayisi, gunlukOrtalama }
}

// Sezon + bölüm çiftini, dizinin başından itibaren kaçıncı bölüm olduğuna
// çevirir — ilerleme çubuğu ve "günde ortalama X bölüm" hesabı için tek bir
// sayı gerekiyor. 0. sezon (Özel Bölümler) sayılmıyor, detay.sezonlar zaten
// bunu filtrelemiş geliyor.
function toplamIzlenenBolum(sezonlar, mevcutSezon, mevcutBolum) {
  if (!sezonlar) return mevcutBolum || 0
  let toplam = 0
  for (const s of sezonlar) {
    if (s.season_number < mevcutSezon) toplam += s.episode_count || 0
    else if (s.season_number === mevcutSezon) {
      toplam += mevcutBolum || 0
      break
    }
  }
  return toplam
}

function KisiListesi({ kisiler, etiket }) {
  if (!kisiler || kisiler.length === 0) return null
  return (
    <p className="mt-1 text-xs text-murekkep">
      <span className="text-kraft">{etiket}: </span>
      {kisiler.map((k, i) => (
        <span key={k.id}>
          <Link to={`/kisi/${k.id}`} className="hover:underline hover:text-deniz">
            {k.name}
          </Link>
          {i < kisiler.length - 1 && ', '}
        </span>
      ))}
    </p>
  )
}

export default function EserSayfasi({ tur }) {
  const { id } = useParams()
  const { kullanici, profil } = useAuth()
  const {
    gonderiler,
    yukleniyor: gonderilerYukleniyor,
    ortalamaPuan,
    puanSayisi,
    kullanicininPuani,
    yenidenYukle: puanlariYenidenYukle,
  } = useEserGonderileri(tur, id)
  const { incelemeler, yukleniyor: incelemelerYukleniyor } = useKitapIncelemeleri(tur === 'kitap' ? id : null)
  const [puanKaydediliyor, setPuanKaydediliyor] = useState(false)

  // Faz 2: kitap bilgisi düzenleme (dahili katalog düzeltmesi)
  const [duzenleModuAcik, setDuzenleModuAcik] = useState(false)
  const [duzenleTaslak, setDuzenleTaslak] = useState(null)
  const [duzenleKaydediliyor, setDuzenleKaydediliyor] = useState(false)

  // Alıntı Duvarı (sadece kitap)
  const [alintilar, setAlintilar] = useState([])
  const [alintilarYukleniyor, setAlintilarYukleniyor] = useState(true)
  const [yeniAlintiMetni, setYeniAlintiMetni] = useState('')
  const [yeniAlintiSayfa, setYeniAlintiSayfa] = useState('')
  const [alintiKaydediliyor, setAlintiKaydediliyor] = useState(false)
  const [alintilarTumunuGorAcik, setAlintilarTumunuGorAcik] = useState(false)
  const [fragmanAcik, setFragmanAcik] = useState(false)
  const [listeMenusuAcik, setListeMenusuAcik] = useState(false)
  const [listeyeEkleniyor, setListeyeEkleniyor] = useState(null)
  const { listeler: kendiListelerim } = useKisiselListeler(kullanici?.uid)
  const [esereAitListeler, setEsereAitListeler] = useState([])
  const [oscarSezonlari, setOscarSezonlari] = useState([])
  const [ilgiliEserler, setIlgiliEserler] = useState([])
  const [ilgiliEkleAcik, setIlgiliEkleAcik] = useState(false)
  const [ilgiliKategori, setIlgiliKategori] = useState('sinema') // kitap sayfasında hedef film/dizi seçimi
  const [ilgiliArama, setIlgiliArama] = useState('')
  const [ilgiliSonuclar, setIlgiliSonuclar] = useState([])
  const [ilgiliAramaYukleniyor, setIlgiliAramaYukleniyor] = useState(false)
  const [ilgiliEkleniyor, setIlgiliEkleniyor] = useState(null)
  const [ilgiliElleAcik, setIlgiliElleAcik] = useState(false)
  const [ilgiliElleForm, setIlgiliElleForm] = useState({ baslik: '', yazar: '', yayinevi: '', yil: '', posterUrl: '' })
  const [ilgiliElleKaydediliyor, setIlgiliElleKaydediliyor] = useState(false)

  // Wikidata Köprüsü — "İlgili Eser Ekle" panelinde tek tıkla öneri getirme.
  // Sadece kullanıcı butona bastığında TEK bir SPARQL isteği atılır, sayfa
  // yüklemesinde otomatik çağrı YOK (bkz. utils/wikidata.js).
  const [wikidataOneriler, setWikidataOneriler] = useState([])
  const [wikidataYukleniyor, setWikidataYukleniyor] = useState(false)
  const [wikidataDenendi, setWikidataDenendi] = useState(false)
  const [wikidataEkleniyor, setWikidataEkleniyor] = useState(null)

  // Strateji 3: Otomatik İlginç Bilgiler — film/dizi sayfasında çekim yeri,
  // sanat akımı gibi Wikidata trivia'sı. Diğer opsiyonel zenginleştirmeler
  // (dış puanlar, sağlayıcılar) gibi sayfa yüklenirken sessizce denenir,
  // veri yoksa hiçbir şey göstermez.
  const [trivia, setTrivia] = useState(null)

  // Yorumlar — günceden farklı: puanlama/kayıt gerektirmeyen, serbest metinli
  // bir tartışma alanı. Sayfa yüklenirken sessizce çekilir.
  const [yorumlar, setYorumlar] = useState([])
  const [yorumlarYukleniyor, setYorumlarYukleniyor] = useState(true)
  const [yeniYorum, setYeniYorum] = useState('')
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false)
  const [triviaAcik, setTriviaAcik] = useState(false)

  const ilgiliHedefTur = tur === 'kitap' ? ilgiliKategori : 'kitap'

  useEffect(() => {
    let iptal = false
    const disIdTipli = tur === 'kitap' ? id : Number(id)
    ilgiliEserleriGetir(tur, disIdTipli).then((l) => {
      if (!iptal) setIlgiliEserler(l)
    })
    return () => {
      iptal = true
    }
  }, [tur, id])

  async function ilgiliAra(e) {
    e.preventDefault()
    if (!ilgiliArama.trim()) return
    setIlgiliAramaYukleniyor(true)
    setIlgiliSonuclar([])
    try {
      if (ilgiliHedefTur === 'kitap') {
        const [trSonuclar, googleData] = await Promise.all([
          turkceKitapAra(ilgiliArama, 8),
          (async () => {
            const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
            const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(ilgiliArama)}&langRestrict=tr&maxResults=6${anahtarParcasi}`
            const res = await fetch(url)
            const data = await res.json()
            if (!res.ok) return []
            return data.items || []
          })(),
        ])
        setIlgiliSonuclar([
          ...trSonuclar.map((k) => ({ id: `tr_${k.id}`, kaynak: 'tr', ham: k })),
          ...googleData.map((item) => ({ id: item.id, kaynak: 'google', ham: item })),
        ])
      } else {
        if (!TMDB_API_KEY) return
        const uc = ilgiliHedefTur === 'sinema' ? 'movie' : 'tv'
        const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(ilgiliArama)}`
        const res = await fetch(url)
        const data = await res.json()
        setIlgiliSonuclar(data.results || [])
      }
    } finally {
      setIlgiliAramaYukleniyor(false)
    }
  }

  async function ilgiliSec(item) {
    if (!kullanici) return
    setIlgiliEkleniyor(item.id)
    try {
      let hedef
      if (ilgiliHedefTur === 'kitap') {
        const kitap = item.kaynak === 'tr' ? await turkceKitaptanKaydet(item.ham) : await kitapAramaSonucundanKaydet(item.ham)
        hedef = { tur: 'kitap', disId: kitap.id, baslik: kitap.baslik, alt: kitap.yazar, posterUrl: kitap.posterUrl }
      } else {
        const v = item
        hedef = {
          tur: ilgiliHedefTur,
          disId: v.id,
          baslik: ilgiliHedefTur === 'sinema' ? v.title : v.name,
          alt: (ilgiliHedefTur === 'sinema' ? v.release_date : v.first_air_date)?.slice(0, 4) || '',
          posterUrl: v.poster_path ? `${TMDB_POSTER}${v.poster_path}` : '',
        }
      }
      const kaynak = { tur, disId: tur === 'kitap' ? id : Number(id), baslik: detay.baslik, alt: detay.yazar || detay.yil || '', posterUrl: detay.posterUrl }
      await ilgiliEserEkle(kaynak, hedef, kullanici)
      setIlgiliEserler((onceki) => [...onceki, { digerTur: hedef.tur, digerDisId: hedef.disId, digerBaslik: hedef.baslik, digerPosterUrl: hedef.posterUrl, digerAlt: hedef.alt }])
      setIlgiliArama('')
      setIlgiliSonuclar([])
      setIlgiliEkleAcik(false)
    } finally {
      setIlgiliEkleniyor(null)
    }
  }

  async function ilgiliElleKaydet(e) {
    e.preventDefault()
    if (!ilgiliElleForm.baslik.trim() || !kullanici) return
    setIlgiliElleKaydediliyor(true)
    try {
      const kitap = await kitapElleEkle(ilgiliElleForm, kullanici)
      const hedef = { tur: 'kitap', disId: kitap.id, baslik: kitap.baslik, alt: kitap.yazar, posterUrl: kitap.posterUrl }
      const kaynak = { tur, disId: tur === 'kitap' ? id : Number(id), baslik: detay.baslik, alt: detay.yazar || detay.yil || '', posterUrl: detay.posterUrl }
      await ilgiliEserEkle(kaynak, hedef, kullanici)
      setIlgiliEserler((onceki) => [...onceki, { digerTur: 'kitap', digerDisId: kitap.id, digerBaslik: kitap.baslik, digerPosterUrl: kitap.posterUrl, digerAlt: kitap.yazar }])
      setIlgiliElleAcik(false)
      setIlgiliEkleAcik(false)
      setIlgiliArama('')
      setIlgiliSonuclar([])
    } finally {
      setIlgiliElleKaydediliyor(false)
    }
  }

  async function ilgiliKaldirTiklandi(ilgili) {
    if (!window.confirm('Bu bağlantıyı kaldırmak istediğine emin misin?')) return
    const kaynak = { tur, disId: tur === 'kitap' ? id : Number(id) }
    const hedef = { tur: ilgili.digerTur, disId: ilgili.digerDisId }
    await ilgiliEserSil(kaynak, hedef)
    setIlgiliEserler((onceki) => onceki.filter((x) => !(x.digerTur === ilgili.digerTur && x.digerDisId === ilgili.digerDisId)))
  }

  // Wikidata'dan uyarlama önerisi getir — kitap sayfasında film/dizi, film/dizi
  // sayfasında kaynak kitap arar. Wikidata'da her eserin bu ilişkisi işaretli
  // olmadığından (özellikle Türkçe çeviri başlıklarında) boş dönebilir, bu normal.
  async function wikidataOnerileriniGetir() {
    setWikidataYukleniyor(true)
    setWikidataDenendi(false)
    setWikidataOneriler([])
    try {
      const sonuc =
        tur === 'kitap' ? await kitaptanFilmOner(detay.baslik, detay.yazar) : await filmdenKitapOner(Number(id))
      // Zaten eklenmiş film/dizi önerilerini gizle (kitap önerilerinde ID tipleri
      // farklı olduğundan — Wikidata QID'si vs. Google Books ID'si — bu kontrolü
      // atlıyoruz, kullanıcı zaten aynı kitabı tekrar eklerse setDoc üzerine yazar).
      setWikidataOneriler(tur === 'kitap' ? sonuc.filter((oneri) => !ilgiliEserler.some((x) => x.digerDisId === oneri.tmdbId)) : sonuc)
    } finally {
      setWikidataYukleniyor(false)
      setWikidataDenendi(true)
    }
  }

  async function wikidataOneriEkle(oneri) {
    if (!kullanici) return
    setWikidataEkleniyor(oneri.wikidataQid)
    try {
      const kaynak = { tur, disId: tur === 'kitap' ? id : Number(id), baslik: detay.baslik, alt: detay.yazar || detay.yil || '', posterUrl: detay.posterUrl }
      let hedef

      if (tur === 'kitap') {
        // Öneri bir film/dizi — Wikidata P144 hem filme hem diziye bağlanabildiğinden
        // önce movie, olmazsa tv uç noktasını deneyip TMDB'den tam veriyi çekiyoruz.
        if (!TMDB_API_KEY) return
        let v = null
        let hedefTur = 'sinema'
        for (const deneme of [{ uc: 'movie', hedefTur: 'sinema' }, { uc: 'tv', hedefTur: 'dizi' }]) {
          const res = await fetch(`https://api.themoviedb.org/3/${deneme.uc}/${oneri.tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
          if (res.ok) {
            v = await res.json()
            hedefTur = deneme.hedefTur
            break
          }
        }
        if (!v) return
        hedef = {
          tur: hedefTur,
          disId: oneri.tmdbId,
          baslik: hedefTur === 'sinema' ? v.title : v.name,
          alt: (hedefTur === 'sinema' ? v.release_date : v.first_air_date)?.slice(0, 4) || '',
          posterUrl: v.poster_path ? `${TMDB_POSTER}${v.poster_path}` : '',
        }
      } else {
        // Öneri bir kitap — ISBN varsa Google Books'tan zengin veriyle kaydet,
        // yoksa (veya bulunamazsa) sadece başlık/yazarla elle ekle akışına düş.
        let kitap = null
        if (oneri.isbn13) {
          try {
            const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${oneri.isbn13}${anahtarParcasi}`)
            const data = await res.json()
            if (res.ok && data.items?.[0]) kitap = await kitapAramaSonucundanKaydet(data.items[0])
          } catch {
            // sessizce elle ekleme akışına düş
          }
        }
        if (!kitap) {
          kitap = await kitapElleEkle(
            { baslik: oneri.baslik, yazar: oneri.yazar, yayinevi: '', yil: '', ozet: '', turler: '', sayfaSayisi: null, posterUrl: '' },
            kullanici
          )
        }
        hedef = { tur: 'kitap', disId: kitap.id, baslik: kitap.baslik, alt: kitap.yazar, posterUrl: kitap.posterUrl }
      }

      await ilgiliEserEkle(kaynak, hedef, kullanici)
      setIlgiliEserler((onceki) => [...onceki, { digerTur: hedef.tur, digerDisId: hedef.disId, digerBaslik: hedef.baslik, digerPosterUrl: hedef.posterUrl, digerAlt: hedef.alt }])
      setWikidataOneriler((onceki) => onceki.filter((o) => o.wikidataQid !== oneri.wikidataQid))
    } finally {
      setWikidataEkleniyor(null)
    }
  }

  useEffect(() => {
    if (tur !== 'sinema') return
    let iptal = false
    filmOscarBilgisiGetir(Number(id)).then((s) => {
      if (!iptal) setOscarSezonlari(s)
    })
    return () => {
      iptal = true
    }
  }, [tur, id])

  useEffect(() => {
    if (tur !== 'sinema' && tur !== 'dizi') return
    let iptal = false
    filmTriviaGetir(Number(id)).then((t) => {
      if (!iptal) setTrivia(t)
    })
    return () => {
      iptal = true
    }
  }, [tur, id])

  useEffect(() => {
    let iptal = false
    const disIdTipli = tur === 'kitap' ? id : Number(id)
    setYorumlarYukleniyor(true)
    eserYorumlariGetir(tur, disIdTipli).then((liste) => {
      if (iptal) return
      setYorumlar(liste)
      setYorumlarYukleniyor(false)
    })
    return () => {
      iptal = true
    }
  }, [tur, id])

  async function yorumGonder(e) {
    e.preventDefault()
    if (!yeniYorum.trim() || !kullanici) return
    setYorumGonderiliyor(true)
    try {
      const disIdTipli = tur === 'kitap' ? id : Number(id)
      const yeniId = await eserYorumEkle(tur, disIdTipli, kullanici, profil?.adSoyad, yeniYorum)
      setYorumlar((onceki) => [...onceki, { id: yeniId, yazarId: kullanici.uid, yazarAdi: profil?.adSoyad || kullanici.displayName, metin: yeniYorum.trim() }])
      setYeniYorum('')
    } finally {
      setYorumGonderiliyor(false)
    }
  }

  async function yorumSilTiklandi(yorumId) {
    if (!window.confirm('Bu yorumu silmek istediğine emin misin?')) return
    await yorumSil(yorumId)
    setYorumlar((onceki) => onceki.filter((y) => y.id !== yorumId))
  }


  useEffect(() => {
    let iptal = false
    const disIdTipli = tur === 'kitap' ? id : Number(id)
    esereAitListeleriGetir(tur, disIdTipli, kullanici?.uid).then((l) => {
      if (!iptal) setEsereAitListeler(l)
    })
    return () => {
      iptal = true
    }
  }, [tur, id, kullanici?.uid])

  async function listeyeEkle(liste) {
    setListeyeEkleniyor(liste.id)
    try {
      await listeyeOgeEkle(liste, {
        tur,
        disId: tur === 'kitap' ? id : Number(id),
        baslik: detay.baslik,
        alt: detay.yazar || detay.yil || '',
        posterUrl: detay.posterUrl,
      })
      setListeMenusuAcik(false)
      setEsereAitListeler((onceki) => [...onceki, liste])
    } finally {
      setListeyeEkleniyor(null)
    }
  }

  const [detay, setDetay] = useState(null)
  const [disPuanlar, setDisPuanlar] = useState(null) // { imdb, rottenTomatoes, metacritic }
  const [saglayicilar, setSaglayicilar] = useState(null)
  const [detayYukleniyor, setDetayYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const [favoriMi_, setFavoriMi_] = useState(false)
  const [izlenecekKaydi, setIzlenecekKaydi] = useState(null)
  const [sayfaTaslak, setSayfaTaslak] = useState(0)
  const [sezonTaslak, setSezonTaslak] = useState(1)
  const [bolumTaslak, setBolumTaslak] = useState(0)
  const [baslangicDuzenleAcik, setBaslangicDuzenleAcik] = useState(false)
  const [baslangicTaslak, setBaslangicTaslak] = useState('')
  const [gunlukEkleniyor, setGunlukEkleniyor] = useState(false)
  const [gunlukTarihi, setGunlukTarihi] = useState(new Date().toISOString().slice(0, 10))
  const [gunlukTekrar, setGunlukTekrar] = useState(false)
  const [favoriIsleniyor, setFavoriIsleniyor] = useState(false)
  const [izlenecekIsleniyor, setIzlenecekIsleniyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setDetayYukleniyor(true)
      setHata('')
      setDisPuanlar(null)
      try {
        if (tur === 'sinema' || tur === 'dizi') {
          if (!TMDB_API_KEY) throw new Error('TMDB API anahtarı tanımlı değil.')
          const uc = tur === 'sinema' ? 'movie' : 'tv'
          const sertifikaAlanAdi = tur === 'sinema' ? 'release_dates' : 'content_ratings'
          const url = `https://api.themoviedb.org/3/${uc}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits,videos,similar,images,external_ids,${sertifikaAlanAdi}&include_image_language=null,tr,en`
          const res = await fetch(url)
          const data = await res.json()
          if (!res.ok) throw new Error(data.status_message || `HTTP ${res.status}`)
          if (iptal) return

          const yonetmenler =
            tur === 'sinema'
              ? (data.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => ({ id: k.id, name: k.name }))
              : (data.created_by || []).map((k) => ({ id: k.id, name: k.name }))
          // Senaristler — TMDB'de "Screenplay" en yaygın ve doğru etiket;
          // bazı filmlerde sadece "Writer" işaretlenmiş oluyor, o durumda ona düşüyoruz.
          const senaristKaynagi = (data.credits?.crew || []).filter((k) => k.job === 'Screenplay')
          const senaristler = [
            ...new Map(
              (senaristKaynagi.length > 0 ? senaristKaynagi : (data.credits?.crew || []).filter((k) => k.job === 'Writer')).map(
                (k) => [k.id, { id: k.id, name: k.name }]
              )
            ).values(),
          ]
          const bestekarlar = [
            ...new Map(
              (data.credits?.crew || [])
                .filter((k) => k.job === 'Original Music Composer')
                .map((k) => [k.id, { id: k.id, name: k.name }])
            ).values(),
          ]

          // Yaş sınırı (TR) — film ve dizi için TMDB'nin farklı veri
          // şekillerini (release_dates vs content_ratings) tek bir alana indirger.
          let sertifika = ''
          if (tur === 'sinema') {
            const trKayit = (data.release_dates?.results || []).find((r) => r.iso_3166_1 === 'TR')
            sertifika = trKayit?.release_dates?.find((rd) => rd.certification)?.certification || ''
          } else {
            const trKayit = (data.content_ratings?.results || []).find((r) => r.iso_3166_1 === 'TR')
            sertifika = trKayit?.rating || ''
          }

          // Koleksiyon/Seri — sadece filmde var, TMDB ana yanıtta zaten
          // geliyor, ekstra istek gerekmiyor. Serideki diğer filmleri
          // göstermek için TEK bir ek istek (koleksiyon varsa) — TMDB kendi
          // API'si olduğundan Wikidata'daki gibi bir rate limit kaygımız yok.
          let koleksiyon =
            tur === 'sinema' && data.belongs_to_collection
              ? {
                  id: data.belongs_to_collection.id,
                  ad: data.belongs_to_collection.name,
                  filmler: [],
                }
              : null
          if (koleksiyon) {
            try {
              const kolRes = await fetch(
                `https://api.themoviedb.org/3/collection/${koleksiyon.id}?api_key=${TMDB_API_KEY}&language=tr-TR`
              )
              const kolData = await kolRes.json()
              if (kolRes.ok) {
                koleksiyon.filmler = (kolData.parts || [])
                  .filter((f) => f.id !== Number(id))
                  .sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''))
                  .map((f) => ({ id: f.id, baslik: f.title, yil: f.release_date?.slice(0, 4) || '', posterUrl: f.poster_path ? `${TMDB_POSTER}${f.poster_path}` : '' }))
              }
            } catch {
              // sessizce geç — koleksiyon rozeti zaten gösterilecek, sadece film listesi eksik kalır
            }
          }

          const oyuncular = (data.credits?.cast || [])
            .slice(0, 10)
            .map((k) => ({ id: k.id, name: k.name, karakter: k.character, fotoUrl: k.profile_path ? `https://image.tmdb.org/t/p/w185${k.profile_path}` : '' }))

          // Fragman: YouTube'daki resmi fragman videosu
          const fragman = (data.videos?.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
            (data.videos?.results || []).find((v) => v.site === 'YouTube')

          // Benzer filmler/diziler
          const benzerler = (data.similar?.results || []).slice(0, 12)

          // Görsel galerisi (arka plan görselleri)
          const gorseller = (data.images?.backdrops || []).slice(0, 8)

          setDetay({
            baslik: tur === 'sinema' ? data.title : data.name,
            yil: (tur === 'sinema' ? data.release_date : data.first_air_date)?.slice(0, 4),
            posterUrl: data.poster_path ? `${TMDB_POSTER}${data.poster_path}` : '',
            ozet: data.overview,
            turler: (data.genres || []).map((g) => g.name).join(', '),
            turListesi: (data.genres || []).map((g) => ({ id: g.id, ad: g.name })),
            sureDk: tur === 'sinema' ? data.runtime : null,
            sezonSayisi: tur === 'dizi' ? data.number_of_seasons : null,
            bolumSayisi: tur === 'dizi' ? data.number_of_episodes : null,
            // Sezon başına bölüm sayısı — ilerleme çubuğunu hesaplamak için
            // (bkz. "Şu An İzliyorsun" paneli). 0 numaralı sezon genelde
            // "Özel Bölümler" oluyor, ana ilerlemeye dahil etmiyoruz.
            sezonlar:
              tur === 'dizi'
                ? (data.seasons || []).filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number)
                : null,
            yonetmenler,
            senaristler,
            bestekarlar,
            oyuncular,
            tagline: data.tagline || '',
            sertifika,
            koleksiyon,
            dbPuan: data.vote_average ? data.vote_average.toFixed(1) : null,
            imdbId: data.external_ids?.imdb_id || null,
            fragmanId: fragman?.key || null,
            benzerler,
            gorseller,
          })

          // Dış puanlar (IMDb / Rotten Tomatoes / Metacritic) — TMDB'nin
          // vote_average'ı zaten var, bunlar "dünya ne diyor" özetini
          // tamamlıyor. OMDb tek çağrıda üçünü birden veriyor (Ratings
          // dizisi), IMDb ID'si TMDB'nin external_ids'inden geliyor,
          // ekstra bir arama/eşleştirme gerekmiyor.
          if (OMDB_API_KEY && data.external_ids?.imdb_id) {
            fetch(`https://www.omdbapi.com/?i=${data.external_ids.imdb_id}&apikey=${OMDB_API_KEY}`)
              .then((r) => r.json())
              .then((omdb) => {
                if (iptal || omdb.Response === 'False') return
                const bul = (kaynak) => omdb.Ratings?.find((r) => r.Source === kaynak)?.Value || null
                setDisPuanlar({
                  imdb: omdb.imdbRating && omdb.imdbRating !== 'N/A' ? omdb.imdbRating : null,
                  rottenTomatoes: bul('Rotten Tomatoes'),
                  metacritic: bul('Metacritic') || (omdb.Metascore !== 'N/A' ? `${omdb.Metascore}/100` : null),
                })
              })
              .catch(() => {}) // sessizce geç — dış puanlar opsiyonel bir ek, sayfayı bloklamasın
          }

          // Nerede İzlenebilir (Türkiye) — TMDB'nin JustWatch verisi üzerinden sağladığı uç nokta
          try {
            const spUrl = `https://api.themoviedb.org/3/${uc}/${id}/watch/providers?api_key=${TMDB_API_KEY}`
            const spRes = await fetch(spUrl)
            const spData = await spRes.json()
            if (!iptal) setSaglayicilar(spData.results?.TR || null)
          } catch (e) {
            console.warn('İzleme sağlayıcıları alınamadı:', e.message)
          }
        } else if (tur === 'kitap') {
          // Faz 1: önce dahili kataloğa (Firestore) bakılır; yoksa Google Books +
          // Open Library birleştirilip kalıcı olarak yazılır. Bkz. utils/kitapKatalog.js
          const k = await kitapGetir(id)
          if (iptal) return
          setDetay({
            baslik: k.baslik,
            yazar: k.yazar,
            yil: k.yil,
            posterUrl: k.posterUrl,
            ozet: k.ozet,
            turler: k.turler,
            sayfaSayisi: k.sayfaSayisi,
            yayinevi: k.yayinevi,
            dbPuan: k.dbPuan ? Number(k.dbPuan).toFixed(1) : null,
          })
        }
      } catch (err) {
        if (!iptal) setHata(err.message)
      } finally {
        if (!iptal) setDetayYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur, id])

  useEffect(() => {
    let iptal = false
    async function kontrolEt() {
      if (!kullanici) {
        setFavoriMi_(false)
        setIzlenecekKaydi(null)
        return
      }
      const [fav, izl] = await Promise.all([favoriMi(kullanici.uid, tur, id), izlenecekGetir(kullanici.uid, tur, id)])
      if (!iptal) {
        setFavoriMi_(fav)
        setIzlenecekKaydi(izl)
        if (izl?.suankiSayfa != null) setSayfaTaslak(izl.suankiSayfa)
        if (izl?.mevcutSezon != null) setSezonTaslak(izl.mevcutSezon)
        if (izl?.mevcutBolum != null) setBolumTaslak(izl.mevcutBolum)
      }
    }
    kontrolEt()
    return () => {
      iptal = true
    }
  }, [kullanici, tur, id])

  // Kendiliğinden onarım: kitap sonradan düzenlenip sayfa sayısı eklendiyse
  // ama izlenecek kaydı hâlâ eski (boş) değeri taşıyorsa, sessizce doldur.
  useEffect(() => {
    if (
      tur === 'kitap' &&
      izlenecekKaydi?.durum === 'okunuyor' &&
      !izlenecekKaydi.toplamSayfa &&
      detay?.sayfaSayisi &&
      kullanici
    ) {
      toplamSayfaTamamla(kullanici.uid, tur, id, detay.sayfaSayisi)
      setIzlenecekKaydi((onceki) => ({ ...onceki, toplamSayfa: detay.sayfaSayisi }))
    }
  }, [tur, id, kullanici, detay?.sayfaSayisi, izlenecekKaydi?.durum, izlenecekKaydi?.toplamSayfa])

  // Kendiliğinden onarım: "Okumaya Başlıyorum" başlangıç tarihi kaydetme
  // özelliğinden önce başlanmış okumalar için baslangicTarihi eksik kalmış
  // olabilir — varsa doldurmuyoruz (elimizde gerçek tarih yok), sadece bir
  // kez "şimdi" olarak yazıp günlük ortalamanın buradan itibaren sayılmasını
  // sağlıyoruz.
  useEffect(() => {
    if (izlenecekKaydi?.durum === 'okunuyor' && !izlenecekKaydi.baslangicTarihi && kullanici) {
      baslangicTarihiTamamla(kullanici.uid, tur, id)
      setIzlenecekKaydi((onceki) => ({ ...onceki, baslangicTarihi: { toMillis: () => Date.now() } }))
    }
  }, [tur, id, kullanici, izlenecekKaydi?.durum, izlenecekKaydi?.baslangicTarihi])

  useEffect(() => {
    if (tur !== 'kitap' || !id) {
      setAlintilarYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setAlintilarYukleniyor(true)
      const liste = await kitapAlintilariGetir(id)
      if (!iptal) {
        setAlintilar(liste)
        setAlintilarYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur, id])

  async function alintiPaylas(e) {
    e.preventDefault()
    if (!kullanici || !yeniAlintiMetni.trim() || !detay) return
    setAlintiKaydediliyor(true)
    try {
      await alintiEkle(kullanici, profil, {
        kitapId: id,
        kitapBaslik: detay.baslik,
        kitapYazar: detay.yazar,
        kitapPosterUrl: detay.posterUrl,
        metin: yeniAlintiMetni,
        sayfa: yeniAlintiSayfa,
      })
      setYeniAlintiMetni('')
      setYeniAlintiSayfa('')
      const liste = await kitapAlintilariGetir(id)
      setAlintilar(liste)
    } finally {
      setAlintiKaydediliyor(false)
    }
  }

  async function alintiBegenTiklandi(alinti) {
    if (!kullanici) return
    const begeniyorMu = (alinti.begenenler || []).includes(kullanici.uid)
    setAlintilar((liste) =>
      liste.map((a) =>
        a.id === alinti.id
          ? { ...a, begenenler: begeniyorMu ? a.begenenler.filter((u) => u !== kullanici.uid) : [...(a.begenenler || []), kullanici.uid] }
          : a
      )
    )
    await alintiBegenDegistir(alinti.id, kullanici.uid, begeniyorMu)
  }

  async function alintiSilTiklandi(alintiId) {
    if (!window.confirm('Bu alıntıyı silmek istediğine emin misin?')) return
    await alintiSil(alintiId)
    setAlintilar((liste) => liste.filter((a) => a.id !== alintiId))
  }

  function duzenlemeyiAc() {
    setDuzenleTaslak({
      baslik: detay.baslik || '',
      yazar: detay.yazar || '',
      posterUrl: detay.posterUrl || '',
      ozet: detay.ozet || '',
      turler: detay.turler || '',
      sayfaSayisi: detay.sayfaSayisi || '',
      yayinevi: detay.yayinevi || '',
    })
    setDuzenleModuAcik(true)
  }

  async function duzenlemeyiKaydet(e) {
    e.preventDefault()
    if (!kullanici || !duzenleTaslak) return
    setDuzenleKaydediliyor(true)
    try {
      const guncellenen = await kitapGuncelle(id, duzenleTaslak, kullanici)
      setDetay((onceki) => ({
        ...onceki,
        baslik: guncellenen.baslik,
        yazar: guncellenen.yazar,
        posterUrl: guncellenen.posterUrl,
        ozet: guncellenen.ozet,
        turler: guncellenen.turler,
        sayfaSayisi: guncellenen.sayfaSayisi,
        yayinevi: guncellenen.yayinevi,
      }))
      // Bu kitap daha önce kapaksız tavsiye edildiyse / birinin "izleyecek-
      // lerim/okuyorum" listesine kapaksız girdiyse, ikisini de geriye dönük
      // dolduruyoruz (bkz. tavsiyePosterleriniSenkronizeEt ve
      // izlenecekPosterleriniSenkronizeEt yorumları).
      if (guncellenen.posterUrl) {
        tavsiyePosterleriniSenkronizeEt('kitap', id, guncellenen.posterUrl).catch(() => {})
        izlenecekPosterleriniSenkronizeEt('kitap', id, guncellenen.posterUrl).catch(() => {})
      }
      setDuzenleModuAcik(false)
    } catch (err) {
      window.alert('Kaydedilemedi: ' + err.message)
    } finally {
      setDuzenleKaydediliyor(false)
    }
  }

  async function favoriDegistir() {
    if (!kullanici || !detay) return
    setFavoriIsleniyor(true)
    try {
      if (favoriMi_) {
        await favoriKaldir(kullanici.uid, tur, id)
      } else {
        await favoriEkle(kullanici, {
          tur,
          disId: id,
          baslik: detay.baslik,
          alt: detay.yazar || '',
          posterUrl: detay.posterUrl,
        })
      }
      setFavoriMi_(!favoriMi_)
    } finally {
      setFavoriIsleniyor(false)
    }
  }

  async function izlenecegeEkle() {
    if (!kullanici || !detay) return
    setIzlenecekIsleniyor(true)
    try {
      await izlenecekEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        alt: detay.yazar || '',
        posterUrl: detay.posterUrl,
        toplamSayfa: detay.sayfaSayisi || null,
      })
      setIzlenecekKaydi({ durum: 'planlanan' })
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  // "+ Ekle" + "Okumaya Başla" iki ayrı adımını tek tıka indiren kısayol
  async function dogrudanOkumayaBasla() {
    if (!kullanici || !detay) return
    setIzlenecekIsleniyor(true)
    try {
      await gunlukKaydiEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        posterUrl: detay.posterUrl,
        yil: detay.yil || '',
        izlemeTarihiISO: new Date().toISOString().slice(0, 10),
        olayTuru: 'baslama',
      })
      await izlenecekEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        alt: detay.yazar || '',
        posterUrl: detay.posterUrl,
        toplamSayfa: detay.sayfaSayisi || null,
        durum: 'okunuyor',
      })
      setIzlenecekKaydi({ durum: 'okunuyor', toplamSayfa: detay.sayfaSayisi || null, suankiSayfa: 0 })
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function izlemeyiBitir() {
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      // "Bitirdim" — gerçek bir tamamlama olayı, günlüğe düşüyor. (938.
      // satırdaki genel "İzleyeceklerimden çıkar" ikon-butonu bunu
      // çağırmıyor — o sadece listeden çıkarma, bitirme garantisi yok.)
      await gunlukKaydiEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        posterUrl: detay.posterUrl,
        yil: detay.yil || '',
        izlemeTarihiISO: new Date().toISOString().slice(0, 10),
        olayTuru: 'bitirme',
      })
      await izlenecekKaldir(kullanici.uid, tur, id)
      setIzlenecekKaydi(null)
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function izlenecektenKaldir() {
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      await izlenecekKaldir(kullanici.uid, tur, id)
      setIzlenecekKaydi(null)
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function okumayaBaslaTiklandi() {
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      // "Başladım" da bir olay — günlüğe düşüyor.
      await gunlukKaydiEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        posterUrl: detay.posterUrl,
        yil: detay.yil || '',
        izlemeTarihiISO: new Date().toISOString().slice(0, 10),
        olayTuru: 'baslama',
      })
      await okumayaBasla(kullanici.uid, tur, id, detay?.sayfaSayisi || null)
      setIzlenecekKaydi((onceki) => ({ ...onceki, durum: 'okunuyor', toplamSayfa: detay?.sayfaSayisi || null, suankiSayfa: 0 }))
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function ilerlemeyiKaydet(e) {
    e.preventDefault()
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      await ilerlemeGuncelle(kullanici.uid, tur, id, sayfaTaslak)
      setIzlenecekKaydi((onceki) => ({ ...onceki, suankiSayfa: sayfaTaslak }))
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function diziIlerlemesiniKaydet(e) {
    e.preventDefault()
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      await dizideIlerlemeGuncelle(kullanici.uid, id, sezonTaslak, bolumTaslak)
      setIzlenecekKaydi((onceki) => ({ ...onceki, mevcutSezon: sezonTaslak, mevcutBolum: bolumTaslak }))
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  // Bu esere, günlüğe "başlama" kaydı düşürme özelliği kurulmadan ÖNCE
  // başlanmış olabilir (izlenecekKaydi zaten var ama karşılığında hiç günlük
  // kaydı yok) — bu durumda geriye dönük, elle bir "başlama" kaydı eklemenin
  // yolu. Bilinen (düzenlenmiş olabilecek) başlangıç tarihini kullanıyor.
  async function gunlugeGeriyeDonukEkle() {
    if (!kullanici || !detay || !izlenecekKaydi) return
    setGunlukEkleniyor(true)
    try {
      const ms = izlenecekKaydi.baslangicTarihi?.toMillis?.()
      const tarihISO = ms ? new Date(ms).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      await gunlukKaydiEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        posterUrl: detay.posterUrl,
        yil: detay.yil || '',
        izlemeTarihiISO: tarihISO,
        olayTuru: 'baslama',
      })
      window.alert('Günlüğe eklendi.')
    } finally {
      setGunlukEkleniyor(false)
    }
  }

  async function baslangicTarihiniKaydet(e) {
    e.preventDefault()
    if (!kullanici || !baslangicTaslak) return
    setIzlenecekIsleniyor(true)
    try {
      await baslangicTarihiniDuzelt(kullanici.uid, tur, id, baslangicTaslak)
      setIzlenecekKaydi((onceki) => ({ ...onceki, baslangicTarihi: { toMillis: () => new Date(baslangicTaslak).getTime() } }))
      setBaslangicDuzenleAcik(false)
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function puanGonder(puan) {
    if (!kullanici) return
    setPuanKaydediliyor(true)
    try {
      await eserPuanla(tur, id, puan, kullanici, {
        baslik: detay.baslik,
        alt: detay.yazar || '',
        posterUrl: detay.posterUrl,
        yil: detay.yil || '',
        turler: detay.turler || '',
      })
      // Aggregate puanın yanında, kullanıcının seçtiği GERÇEK tarihle bir
      // günlük kaydı da düşüyoruz (bkz. utils/gunluk.js) — Yılın Özeti ve
      // Günlük sekmesi buradan besleniyor, "ne zaman puanladım" değil
      // "ne zaman izledim/okudum" sorusuna cevap versin diye.
      //
      // Aynı esere aynı gün için ZATEN bir kayıt varsa (kullanıcı fikrini
      // değiştirip puanını ★★★→★★★★ gibi ayarladıysa) YENİ bir kayıt EKLEMEK
      // yerine var olanı GÜNCELLİYORUZ — aksi halde her yıldız tıklaması
      // günlüğe ayrı bir satır düşürüp aynı filmi onlarca kez tekrarlıyordu.
      const mevcutKayit = await gunlukKaydiAyniGunGetir(kullanici.uid, tur, id, gunlukTarihi)
      if (mevcutKayit) {
        await gunlukKaydiGuncelle(mevcutKayit.id, { puan, tekrarMi: gunlukTekrar })
      } else {
        await gunlukKaydiEkle(kullanici, {
          tur,
          disId: id,
          baslik: detay.baslik,
          posterUrl: detay.posterUrl,
          yil: detay.yil || '',
          izlemeTarihiISO: gunlukTarihi,
          puan,
          tekrarMi: gunlukTekrar,
        })
      }
      await eserPuanindaGunlukVarIsaretle(tur, id, kullanici.uid)
      puanlariYenidenYukle()
    } finally {
      setPuanKaydediliyor(false)
    }
  }

  const basliklar = { sinema: 'film', dizi: 'dizi', kitap: 'kitap' }
  const eklemeLinki = `/gonderi-ekle?tur=${tur}&disId=${id}`

  if (detayYukleniyor) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (hata) return <p className="text-sm text-muhur">Bilgi alınamadı: {hata}</p>
  if (!detay) return <p className="text-sm text-kraft">Bulunamadı.</p>

  const izlemeSecenekleri = saglayicilar
    ? [
        { etiket: 'Abonelik', liste: saglayicilar.flatrate },
        { etiket: 'Kirala', liste: saglayicilar.rent },
        { etiket: 'Satın Al', liste: saglayicilar.buy },
      ].filter((s) => s.liste && s.liste.length > 0)
    : []

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        {detay.posterUrl && (
          <img
            src={detay.posterUrl}
            alt={detay.baslik}
            className="h-56 w-40 shrink-0 self-center rounded-sm object-cover ring-1 ring-cizgi sm:self-start"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-baslik text-3xl text-murekkep">
            {detay.baslik} {detay.yil && <span className="text-kraft text-xl">({detay.yil})</span>}
          </h1>
          {detay.tagline && <p className="mt-0.5 text-sm italic text-kraft">"{detay.tagline}"</p>}
          {detay.yazar && (
            <p className="text-sm mt-1">
              <Link to={`/yazar/${encodeURIComponent(detay.yazar)}`} className="text-kraft hover:underline hover:text-deniz">
                {detay.yazar}
              </Link>
            </p>
          )}

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-kraft">
            {detay.turListesi?.length > 0 ? (
              detay.turListesi.map((t, i) => (
                <span key={t.id}>
                  <Link to={`/tur/${tur}/${t.id}?ad=${encodeURIComponent(t.ad)}`} className="hover:text-deniz hover:underline">
                    {t.ad}
                  </Link>
                  {i < detay.turListesi.length - 1 && ','}
                </span>
              ))
            ) : detay.turler && tur === 'kitap' ? (
              <Link to={`/kitap-kategori/${encodeURIComponent(detay.turler)}`} className="hover:text-deniz hover:underline">
                {detay.turler}
              </Link>
            ) : (
              detay.turler && <span>{detay.turler}</span>
            )}
            {detay.sureDk && <span>⏱ {detay.sureDk} dk</span>}
            {detay.sertifika && (
              <span className="rounded-sm bg-kagitKoyu px-1.5 py-0.5 font-medium text-murekkep ring-1 ring-cizgi">
                {detay.sertifika}
              </span>
            )}
            {detay.sezonSayisi && <span>📺 {detay.sezonSayisi} sezon</span>}
            {detay.bolumSayisi && <span>{detay.bolumSayisi} bölüm</span>}
            {detay.sayfaSayisi && <span>📄 {detay.sayfaSayisi} sayfa</span>}
            {detay.yayinevi &&
              (tur === 'kitap' ? (
                <Link to={`/yayinevi/${encodeURIComponent(detay.yayinevi)}`} className="hover:text-deniz hover:underline">
                  {detay.yayinevi}
                </Link>
              ) : (
                <span>{detay.yayinevi}</span>
              ))}
            {detay.dbPuan && !disPuanlar && <span>{tur === 'kitap' ? 'Google' : 'TMDB'} {detay.dbPuan}</span>}
          </div>

          {/* Dış puanlar — ayrı bir satırda, kendi görsel ağırlıklarıyla.
              Öncelik sırası: IMDb > Rotten Tomatoes > Metacritic > TMDB/Google
              (IMDb en tanıdık/güvenilen kaynak olduğu için en başta ve en
              belirgin). Gerçek logoları kullanmıyoruz (telif/marka hakkı),
              bunun yerine markaların kendi tanıdık renk şemasını kullanan
              sade rozetler — Metacritic'in kendisi de puanı renk kodluyor,
              aynı mantığı uyguladık. */}
          {(disPuanlar?.imdb || disPuanlar?.rottenTomatoes || disPuanlar?.metacritic || detay.dbPuan) && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {disPuanlar?.imdb && (
                <span className="flex items-center gap-1.5">
                  <span className="rounded-sm bg-[#F5C518] px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-black">IMDb</span>
                  <span className="text-sm font-medium text-murekkep">{disPuanlar.imdb}</span>
                </span>
              )}
              {disPuanlar?.rottenTomatoes && (
                <span className="flex items-center gap-1 text-sm text-murekkep">
                  <span>🍅</span> {disPuanlar.rottenTomatoes}
                </span>
              )}
              {disPuanlar?.metacritic &&
                (() => {
                  const puan = parseInt(disPuanlar.metacritic, 10)
                  const renk = puan >= 75 ? 'bg-[#66cc33]' : puan >= 50 ? 'bg-[#ffcc33]' : 'bg-[#ff0000]'
                  const yaziRengi = puan >= 50 && puan < 75 ? 'text-black' : 'text-white'
                  return (
                    <span className="flex items-center gap-1.5">
                      <span className={`flex h-5 w-6 items-center justify-center rounded-sm text-[11px] font-bold ${renk} ${yaziRengi}`}>
                        {isNaN(puan) ? '–' : puan}
                      </span>
                      <span className="text-xs text-kraft">Metacritic</span>
                    </span>
                  )
                })()}
              {detay.dbPuan && (disPuanlar?.imdb || disPuanlar?.rottenTomatoes || disPuanlar?.metacritic) && (
                <span className="text-xs text-kraft">
                  {tur === 'kitap' ? 'Google' : 'TMDB'} {detay.dbPuan}
                </span>
              )}
            </div>
          )}

          <KisiListesi kisiler={detay.yonetmenler} etiket={tur === 'dizi' ? 'Yaratıcı' : 'Yönetmen'} />
          {tur === 'sinema' && <KisiListesi kisiler={detay.senaristler} etiket="Senarist" />}
          {tur === 'sinema' && <KisiListesi kisiler={detay.bestekarlar} etiket="Müzik" />}

          {tur === 'kitap' && kullanici && !duzenleModuAcik && (
            <button onClick={duzenlemeyiAc} className="mt-2 text-[11px] text-kraft hover:text-deniz hover:underline">
              ✏️ Bilgiyi Düzenle
            </button>
          )}

          {tur === 'kitap' && duzenleModuAcik && duzenleTaslak && (
            <form onSubmit={duzenlemeyiKaydet} className="mt-3 max-w-sm space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <p className="text-xs uppercase tracking-widest text-gise">Kitap Bilgisini Düzenle</p>
              <div>
                <label className="text-[11px] text-kraft">Başlık</label>
                <input
                  value={duzenleTaslak.baslik}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, baslik: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="text-[11px] text-kraft">Yazar</label>
                <input
                  value={duzenleTaslak.yazar}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, yazar: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="text-[11px] text-kraft">Kapak Görseli URL'i</label>
                <input
                  value={duzenleTaslak.posterUrl}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, posterUrl: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
                <p className="mt-1 text-[10px] text-kraft">
                  Kitapyurdu/D&R/İdefix gibi bir siteden kapağa sağ tık → "Görsel adresini kopyala" ile buraya yapıştır.
                </p>
              </div>
              <div>
                <label className="text-[11px] text-kraft">Özet</label>
                <textarea
                  value={duzenleTaslak.ozet}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, ozet: e.target.value }))}
                  rows={4}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="text-[11px] text-kraft">Tür(ler) (virgülle ayır)</label>
                <input
                  value={duzenleTaslak.turler}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, turler: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-kraft">Sayfa Sayısı</label>
                  <input
                    type="number"
                    min="0"
                    value={duzenleTaslak.sayfaSayisi}
                    onChange={(e) => setDuzenleTaslak((t) => ({ ...t, sayfaSayisi: e.target.value }))}
                    className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-kraft">Yayınevi</label>
                  <input
                    value={duzenleTaslak.yayinevi}
                    onChange={(e) => setDuzenleTaslak((t) => ({ ...t, yayinevi: e.target.value }))}
                    className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={duzenleKaydediliyor}
                  className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                >
                  {duzenleKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setDuzenleModuAcik(false)}
                  disabled={duzenleKaydediliyor}
                  className="rounded-sm bg-kagit px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          )}

          {kullanici && (
            <div className="mt-3 flex flex-wrap items-start gap-6">
              <button
                onClick={favoriDegistir}
                disabled={favoriIsleniyor}
                className="flex flex-col items-center gap-1 disabled:opacity-40"
              >
                <span className={`text-2xl ${favoriMi_ ? 'text-muhur' : 'text-cizgi'}`}>{favoriMi_ ? '♥' : '♡'}</span>
                <span className="text-[10px] uppercase tracking-wide text-kraft">Favori</span>
              </button>

              {!izlenecekKaydi && (
                <button
                  onClick={izlenecegeEkle}
                  disabled={izlenecekIsleniyor}
                  className="flex flex-col items-center gap-1 disabled:opacity-40"
                >
                  <span className="text-2xl text-cizgi">🕐</span>
                  <span className="text-[10px] uppercase tracking-wide text-kraft">
                    {tur === 'kitap' ? 'Okuyacaklarım' : 'İzleyeceğim'}
                  </span>
                </button>
              )}
              {izlenecekKaydi && (
                <button
                  onClick={izlenecektenKaldir}
                  disabled={izlenecekIsleniyor}
                  className="flex flex-col items-center gap-1 disabled:opacity-40"
                >
                  <span className="text-2xl text-muhur">🕐</span>
                  <span className="text-[10px] uppercase tracking-wide text-kraft">
                    {tur === 'kitap' ? 'Okuyacaklarımda' : 'İzleyeceklerimde'}
                  </span>
                </button>
              )}

              <div className="relative flex flex-col items-center gap-1">
                <button onClick={() => setListeMenusuAcik((a) => !a)} disabled={false} className="flex flex-col items-center gap-1">
                  <span className="text-2xl text-cizgi">📋</span>
                  <span className="text-[10px] uppercase tracking-wide text-kraft">Liste</span>
                </button>
                {listeMenusuAcik && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-sm bg-kagit p-2 shadow-lg ring-1 ring-cizgi">
                    {kendiListelerim.length === 0 && (
                      <p className="px-2 py-1 text-xs text-kraft">Henüz bir listen yok.</p>
                    )}
                    {kendiListelerim.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => listeyeEkle(l)}
                        disabled={listeyeEkleniyor === l.id}
                        className="block w-full rounded-sm px-2 py-1.5 text-left text-xs text-murekkep hover:bg-kagitKoyu disabled:opacity-40"
                      >
                        {listeyeEkleniyor === l.id ? 'Ekleniyor...' : l.baslik}
                      </button>
                    ))}
                    <Link
                      to="/listelerim"
                      className="mt-1 block rounded-sm px-2 py-1.5 text-left text-xs text-deniz hover:bg-kagitKoyu"
                    >
                      + Yeni Liste Oluştur
                    </Link>
                  </div>
                )}
              </div>

              {(tur === 'kitap' || tur === 'dizi') && !izlenecekKaydi && (
                <button
                  onClick={dogrudanOkumayaBasla}
                  disabled={izlenecekIsleniyor}
                  className="self-center rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                >
                  {tur === 'kitap' ? 'Okumaya Başlıyorum' : 'İzlemeye Başlıyorum'}
                </button>
              )}
              {(tur === 'kitap' || tur === 'dizi') && izlenecekKaydi?.durum === 'planlanan' && (
                <button
                  onClick={okumayaBaslaTiklandi}
                  disabled={izlenecekIsleniyor}
                  className="self-center rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                >
                  {tur === 'kitap' ? 'Okumaya Başla' : 'İzlemeye Başla'}
                </button>
              )}
            </div>
          )}

          {trivia && (
            <div className="mt-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <button
                type="button"
                onClick={() => setTriviaAcik((a) => !a)}
                className="flex w-full items-center justify-between text-xs uppercase tracking-widest text-gise"
              >
                <span>🔍 İlginç Bilgiler</span>
                <span className="text-kraft">{triviaAcik ? '▲' : '▼'}</span>
              </button>
              {triviaAcik && (
              <div className="mt-2 space-y-1.5 text-xs text-kraft">
                {trivia.cekimYerleri.length > 0 && (
                  <p>
                    <span className="text-murekkep">Çekildiği yerler:</span>{' '}
                    {trivia.cekimYerleri.map((yer, i) => (
                      <span key={yer}>
                        {i > 0 && ', '}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(yer)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-deniz hover:underline"
                        >
                          {yer}
                        </a>
                      </span>
                    ))}
                  </p>
                )}
                {trivia.anlatiYerleri.length > 0 && (
                  <p>
                    <span className="text-murekkep">Hikayenin geçtiği yer:</span> {trivia.anlatiYerleri.join(', ')}
                  </p>
                )}
                {trivia.temalar.length > 0 && (
                  <p>
                    <span className="text-murekkep">Tema:</span> {trivia.temalar.join(', ')}
                  </p>
                )}
                {trivia.akimlar.length > 0 && (
                  <p>
                    <span className="text-murekkep">Akım:</span> {trivia.akimlar.join(', ')}
                  </p>
                )}
                {(trivia.butce || trivia.hasilat) && (
                  <p>
                    <span className="text-murekkep">Bütçe / Hasılat:</span>{' '}
                    {trivia.butce ? paraFormatla(trivia.butce) : '?'} / {trivia.hasilat ? paraFormatla(trivia.hasilat) : '?'}
                  </p>
                )}
                {trivia.odulller.length > 0 && (
                  <p>
                    <span className="text-murekkep">Ödüller:</span> {trivia.odulller.slice(0, 6).join(', ')}
                    {trivia.odulller.length > 6 && ` +${trivia.odulller.length - 6} daha`}
                  </p>
                )}
              </div>
              )}
            </div>
          )}

          {esereAitListeler.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-kraft">
              <span>📋 Listelerde:</span>
              {esereAitListeler.map((l) => (
                <Link
                  key={l.id}
                  to={`/liste/${l.id}`}
                  className="rounded-full bg-kagitKoyu px-2.5 py-1 text-murekkep ring-1 ring-cizgi hover:text-deniz"
                >
                  {l.baslik}
                </Link>
              ))}
            </div>
          )}

          {(ilgiliEserler.length > 0 || kullanici) && (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-kraft">{tur === 'kitap' ? '🎬 İlgili Film/Diziler' : '📚 İlgili Kitaplar'}</p>
                {kullanici && (
                  <button
                    type="button"
                    onClick={() => setIlgiliEkleAcik((a) => !a)}
                    className="text-[11px] text-deniz hover:underline"
                  >
                    {ilgiliEkleAcik ? 'Kapat' : '+ Ekle'}
                  </button>
                )}
              </div>

              {ilgiliEkleAcik && (
                <div className="mt-2 w-full space-y-2 rounded-sm bg-kagit p-3 shadow-lg ring-1 ring-cizgi">
                  {tur === 'kitap' && (
                    <div className="flex gap-1">
                      {[
                        { id: 'sinema', etiket: 'Film' },
                        { id: 'dizi', etiket: 'Dizi' },
                      ].map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => {
                            setIlgiliKategori(k.id)
                            setIlgiliSonuclar([])
                          }}
                          className={`rounded-sm px-2 py-1 font-govde text-[11px] ${
                            ilgiliKategori === k.id ? 'bg-murekkep text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                          }`}
                        >
                          {k.etiket}
                        </button>
                      ))}
                    </div>
                  )}
                  <form onSubmit={ilgiliAra} className="flex gap-2">
                    <input
                      type="text"
                      value={ilgiliArama}
                      onChange={(e) => setIlgiliArama(e.target.value)}
                      placeholder={tur === 'kitap' ? 'Film/dizi ara...' : 'Kitap ara...'}
                      className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                    />
                    <button type="submit" className="rounded-sm bg-deniz px-2 py-1 font-govde text-xs text-kagit">
                      {ilgiliAramaYukleniyor ? '...' : 'Ara'}
                    </button>
                  </form>

                  {kullanici && !ilgiliElleAcik && (
                    <div className="rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
                      <button
                        type="button"
                        onClick={wikidataOnerileriniGetir}
                        disabled={wikidataYukleniyor}
                        className="text-[11px] text-deniz hover:underline disabled:opacity-40"
                      >
                        {wikidataYukleniyor ? 'Wikidata sorgulanıyor...' : "🔗 Wikidata'dan Öner"}
                      </button>
                      {wikidataDenendi && !wikidataYukleniyor && wikidataOneriler.length === 0 && (
                        <p className="mt-1 text-[10px] text-kraft">Wikidata'da bir bağlantı bulunamadı.</p>
                      )}
                      {wikidataOneriler.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {wikidataOneriler.map((oneri) => (
                            <li key={oneri.wikidataQid} className="flex items-center justify-between gap-2">
                              <span className="min-w-0 flex-1 truncate text-xs text-murekkep">
                                {oneri.baslik}
                                {tur === 'kitap' && oneri.yil ? ` (${oneri.yil})` : ''}
                                {tur !== 'kitap' && oneri.yazar ? ` — ${oneri.yazar}` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => wikidataOneriEkle(oneri)}
                                disabled={wikidataEkleniyor === oneri.wikidataQid}
                                className="shrink-0 rounded-sm bg-deniz px-2 py-0.5 font-govde text-[10px] text-kagit disabled:opacity-40"
                              >
                                {wikidataEkleniyor === oneri.wikidataQid ? '...' : '+ Ekle'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {ilgiliElleAcik ? (
                    <form onSubmit={ilgiliElleKaydet} className="space-y-2 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
                      <p className="text-[11px] uppercase tracking-widest text-gise">Kitabı Elle Ekle</p>
                      <input
                        value={ilgiliElleForm.baslik}
                        onChange={(e) => setIlgiliElleForm((f) => ({ ...f, baslik: e.target.value }))}
                        placeholder="Başlık *"
                        required
                        className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                      />
                      <input
                        value={ilgiliElleForm.yazar}
                        onChange={(e) => setIlgiliElleForm((f) => ({ ...f, yazar: e.target.value }))}
                        placeholder="Yazar"
                        className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                      />
                      <div className="flex gap-2">
                        <input
                          value={ilgiliElleForm.yayinevi}
                          onChange={(e) => setIlgiliElleForm((f) => ({ ...f, yayinevi: e.target.value }))}
                          placeholder="Yayınevi"
                          className="flex-1 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                        />
                        <input
                          value={ilgiliElleForm.yil}
                          onChange={(e) => setIlgiliElleForm((f) => ({ ...f, yil: e.target.value }))}
                          placeholder="Yıl"
                          className="w-16 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                        />
                      </div>
                      <input
                        value={ilgiliElleForm.posterUrl}
                        onChange={(e) => setIlgiliElleForm((f) => ({ ...f, posterUrl: e.target.value }))}
                        placeholder="Kapak görseli URL'i (opsiyonel)"
                        className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={ilgiliElleKaydediliyor || !ilgiliElleForm.baslik.trim()}
                          className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                        >
                          {ilgiliElleKaydediliyor ? 'Ekleniyor...' : 'Kaydet'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIlgiliElleAcik(false)}
                          className="rounded-sm bg-kagit px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {ilgiliSonuclar.length > 0 && (
                        <ul className="max-h-56 space-y-1 overflow-y-auto">
                          {ilgiliSonuclar.slice(0, 10).map((item) => {
                            const kitapTrMi = ilgiliHedefTur === 'kitap' && item.kaynak === 'tr'
                            const v = ilgiliHedefTur === 'kitap' ? (kitapTrMi ? item.ham : item.ham?.volumeInfo || {}) : item
                            const ad = ilgiliHedefTur === 'kitap' ? (kitapTrMi ? v.baslik : v.title) : ilgiliHedefTur === 'sinema' ? v.title : v.name
                            const kapak =
                              ilgiliHedefTur === 'kitap'
                                ? kitapTrMi
                                  ? ''
                                  : (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://')
                                : v.poster_path
                                  ? `${TMDB_POSTER}${v.poster_path}`
                                  : ''
                            const altSatir =
                              ilgiliHedefTur === 'kitap'
                                ? kitapTrMi
                                  ? [v.yazar, v.yayinevi, v.yil].filter(Boolean).join(' · ')
                                  : [(v.authors || []).join(', '), v.publisher, v.publishedDate?.slice(0, 4)].filter(Boolean).join(' · ') +
                                    ' · Google Books'
                                : (ilgiliHedefTur === 'sinema' ? v.release_date : v.first_air_date)?.slice(0, 4) || ''
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => ilgiliSec(item)}
                                  disabled={ilgiliEkleniyor === item.id}
                                  className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left hover:bg-kagitKoyu disabled:opacity-40"
                                >
                                  {kapak ? (
                                    <img src={kapak} alt="" className="h-9 w-6 shrink-0 rounded-sm object-cover" />
                                  ) : (
                                    ilgiliHedefTur === 'kitap' && (
                                      <div className="flex h-9 w-6 shrink-0 items-center justify-center rounded-sm bg-kagitKoyu text-[9px]">
                                        📖
                                      </div>
                                    )
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs text-murekkep">{ilgiliEkleniyor === item.id ? 'Ekleniyor...' : ad}</p>
                                    {altSatir && <p className="truncate text-[10px] text-kraft">{altSatir}</p>}
                                  </div>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      {ilgiliHedefTur === 'kitap' && kullanici && (
                        <button
                          type="button"
                          onClick={() => {
                            setIlgiliElleForm({ baslik: ilgiliArama, yazar: '', yayinevi: '', yil: '', posterUrl: '' })
                            setIlgiliElleAcik(true)
                          }}
                          className="text-[11px] text-kraft hover:text-deniz hover:underline"
                        >
                          Aradığını bulamadın mı? Elle ekle →
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {ilgiliEserler.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {ilgiliEserler.map((ilgili) => {
                  const esereGit =
                    ilgili.digerTur === 'kitap' ? `/kitap/${ilgili.digerDisId}` : `/${ilgili.digerTur === 'dizi' ? 'dizi' : 'film'}/${ilgili.digerDisId}`
                  return (
                    <div key={ilgili.id} className="group relative w-16 shrink-0">
                      <Link to={esereGit}>
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                          {ilgili.digerPosterUrl && (
                            <img src={ilgili.digerPosterUrl} alt={ilgili.digerBaslik} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-murekkep">{ilgili.digerBaslik}</p>
                      </Link>
                      {kullanici && (
                        <button
                          onClick={() => ilgiliKaldirTiklandi(ilgili)}
                          className="absolute right-0 top-0 rounded-full bg-kagit/90 px-1 text-[10px] text-kraft opacity-0 ring-1 ring-cizgi transition-opacity hover:text-muhur group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              )}
            </div>
          )}

          {oscarSezonlari.length > 0 && (
            <div className="mt-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <p className="mb-2 flex items-center gap-1 text-xs uppercase tracking-widest text-gise">
                <OscarHeykelIkon boyut={14} /> Oscar Adaylıkları · {oscarSezonlari.reduce((n, s) => n + s.kategoriler.length, 0)} dal
              </p>
              <div className="space-y-2">
                {oscarSezonlari.map((s) => (
                  <div key={s.sezonId}>
                    <p className="text-xs font-medium text-murekkep">
                      {s.sezonAdi} {s.yil && `(${s.yil})`}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {s.kategoriler.map((k, i) => (
                        <li key={i} className="flex items-center gap-1 text-xs text-kraft">
                          {k.kazandiMi && <OscarHeykelIkon boyut={12} className="shrink-0 text-gise" />}
                          <span>
                            {k.ad}
                            {k.kisiAdi && ` — ${k.kisiAdi}`}
                            {k.kazandiMi && <span className="text-gise"> (Kazandı)</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {izlenecekKaydi?.durum === 'okunuyor' && (
            <div className="mt-3 max-w-xs rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-widest text-gise">
                  {tur === 'kitap' ? 'Şu An Okuyorsun' : 'Şu An İzliyorsun'}
                </p>
                {izlenecekKaydi.baslangicTarihi?.toMillis && !baslangicDuzenleAcik && (
                  <button
                    onClick={() => {
                      const ms = izlenecekKaydi.baslangicTarihi.toMillis()
                      setBaslangicTaslak(new Date(ms).toISOString().slice(0, 10))
                      setBaslangicDuzenleAcik(true)
                    }}
                    className="shrink-0 text-[10px] text-kraft hover:text-deniz hover:underline"
                  >
                    ✎ Başlangıcı Düzelt
                  </button>
                )}
              </div>

              {kullanici && (
                <button
                  onClick={gunlugeGeriyeDonukEkle}
                  disabled={gunlukEkleniyor}
                  className="mt-1 text-[10px] text-kraft hover:text-deniz hover:underline disabled:opacity-40"
                >
                  {gunlukEkleniyor ? 'Ekleniyor...' : '📔 Bu Okumayı/İzlemeyi Günlüğe Ekle'}
                </button>
              )}

              {baslangicDuzenleAcik && (
                <form onSubmit={baslangicTarihiniKaydet} className="mt-1.5 mb-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={baslangicTaslak}
                    onChange={(e) => setBaslangicTaslak(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                  />
                  <button
                    type="submit"
                    disabled={izlenecekIsleniyor}
                    className="rounded-sm bg-deniz px-2 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaslangicDuzenleAcik(false)}
                    className="text-[11px] text-kraft hover:text-murekkep"
                  >
                    Vazgeç
                  </button>
                </form>
              )}

              {tur === 'kitap' && izlenecekKaydi.toplamSayfa ? (
                <>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-kagit ring-1 ring-cizgi">
                    <div
                      className="h-full bg-deniz"
                      style={{
                        width: `${Math.min(100, Math.round(((izlenecekKaydi.suankiSayfa || 0) / izlenecekKaydi.toplamSayfa) * 100))}%`,
                      }}
                    />
                  </div>
                  {(() => {
                    const hiz = okumaHiziHesapla(izlenecekKaydi.baslangicTarihi, izlenecekKaydi.suankiSayfa || 0)
                    if (!hiz) return null
                    return (
                      <p className="mt-1.5 text-xs text-kraft">
                        {hiz.gunSayisi}. gün{hiz.gunlukOrtalama > 0 && <> · günde ortalama ~{hiz.gunlukOrtalama} sayfa</>}
                      </p>
                    )
                  })()}
                  <form onSubmit={ilerlemeyiKaydet} className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={izlenecekKaydi.toplamSayfa}
                      value={sayfaTaslak}
                      onChange={(e) => setSayfaTaslak(Number(e.target.value))}
                      className="w-20 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                    />
                    <span className="text-xs text-kraft">/ {izlenecekKaydi.toplamSayfa} sayfa</span>
                    <button
                      type="submit"
                      disabled={izlenecekIsleniyor}
                      className="rounded-sm bg-muhur px-2 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
                    >
                      Güncelle
                    </button>
                  </form>
                </>
              ) : tur === 'dizi' && detay.sezonlar?.length > 0 ? (
                <>
                  {(() => {
                    const izlenen = toplamIzlenenBolum(detay.sezonlar, izlenecekKaydi.mevcutSezon || 1, izlenecekKaydi.mevcutBolum || 0)
                    const yuzde = detay.bolumSayisi ? Math.min(100, Math.round((izlenen / detay.bolumSayisi) * 100)) : 0
                    const hiz = okumaHiziHesapla(izlenecekKaydi.baslangicTarihi, izlenen)
                    return (
                      <>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-kagit ring-1 ring-cizgi">
                          <div className="h-full bg-deniz" style={{ width: `${yuzde}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs text-kraft">
                          {izlenen}/{detay.bolumSayisi} bölüm
                          {hiz && hiz.gunlukOrtalama > 0 && <> · {hiz.gunSayisi}. gün · günde ortalama ~{hiz.gunlukOrtalama} bölüm</>}
                        </p>
                      </>
                    )
                  })()}
                  <form onSubmit={diziIlerlemesiniKaydet} className="mt-3 space-y-2">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wide text-kraft">Konumun</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={sezonTaslak}
                          onChange={(e) => {
                            setSezonTaslak(Number(e.target.value))
                            setBolumTaslak(0)
                          }}
                          className="min-w-0 flex-1 rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                        >
                          {detay.sezonlar.map((s) => (
                            <option key={s.season_number} value={s.season_number}>
                              {s.name || `${s.season_number}. Sezon`}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          max={detay.sezonlar.find((s) => s.season_number === sezonTaslak)?.episode_count || 99}
                          value={bolumTaslak}
                          onChange={(e) => setBolumTaslak(Number(e.target.value))}
                          className="w-14 shrink-0 rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                        />
                        <span className="shrink-0 text-xs text-kraft">
                          / {detay.sezonlar.find((s) => s.season_number === sezonTaslak)?.episode_count || '?'} bölüm
                        </span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={izlenecekIsleniyor}
                      className="w-full rounded-sm bg-muhur px-2 py-1.5 font-govde text-[11px] text-kagit disabled:opacity-40"
                    >
                      Güncelle
                    </button>
                  </form>
                </>
              ) : tur === 'kitap' ? (
                <p className="mt-1 text-xs text-kraft">Sayfa bilgisi yok, ilerleme takip edilemiyor.</p>
              ) : null}
              <button onClick={izlemeyiBitir} className="mt-2 text-[11px] text-kraft hover:text-muhur">
                Bitirdim, listeden kaldır
              </button>
            </div>
          )}

          {/* Tek yıldız satırı: giriş yapmışsan kendi (tıklanabilir) puanın, yanında
              topluluk ortalaması sadece metin olarak — iki ayrı yıldız satırı yerine */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {kullanici ? (
              <>
                <YildizSecici deger={kullanicininPuani} onSec={puanGonder} boyut="text-lg" />
                {puanKaydediliyor && <span className="text-xs text-kraft">kaydediliyor...</span>}
              </>
            ) : (
              <YildizSecici deger={ortalamaPuan} disabled boyut="text-lg" />
            )}
            <span className="text-xs text-kraft">
              {ortalamaPuan != null
                ? `Topluluk: ${ortalamaPuan.toFixed(1)} (${puanSayisi} kişi)`
                : kullanici
                  ? 'Henüz kimse puanlamadı'
                  : 'Puan vermek için giriş yap'}
            </span>
          </div>
          {kullanici && (tur === 'sinema' || tur === 'dizi' || tur === 'kitap') && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-kraft">
              <span>{tur === 'kitap' ? 'Ne zaman okudun?' : 'Ne zaman izledin?'}</span>
              <input
                type="date"
                value={gunlukTarihi}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setGunlukTarihi(e.target.value)}
                className="rounded-sm bg-kagit px-2 py-0.5 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={gunlukTekrar} onChange={(e) => setGunlukTekrar(e.target.checked)} />
                🔄 Yeniden {tur === 'kitap' ? 'okuma' : 'izleme'}
              </label>
            </div>
          )}
        </div>
      </div>

      {detay.ozet && <p className="mt-4 text-sm text-murekkep leading-relaxed">{detay.ozet}</p>}


      {(tur === 'sinema' || tur === 'dizi') && izlemeSecenekleri.length > 0 && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Nerede İzlenebilir</h2>
          <div className="space-y-2">
            {izlemeSecenekleri.map((s) => (
              <div key={s.etiket} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-kraft">{s.etiket}</span>
                <div className="flex flex-wrap gap-2">
                  {s.liste.map((p) => (
                    <img
                      key={p.provider_id}
                      src={`${TMDB_SAGLAYICI_LOGO}${p.logo_path}`}
                      alt={p.provider_name}
                      title={p.provider_name}
                      className="h-8 w-8 rounded-sm ring-1 ring-cizgi"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-kraft">
            Veriler{' '}
            {saglayicilar?.link ? (
              <a href={saglayicilar.link} target="_blank" rel="noreferrer" className="hover:underline">
                JustWatch
              </a>
            ) : (
              'JustWatch'
            )}{' '}
            tarafından sağlanmaktadır. Bölgeye ve zamana göre değişebilir.
          </p>
        </div>
      )}

      {detay.koleksiyon && (
        <div className="mt-6 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <p className="text-sm text-murekkep">🎬 {detay.koleksiyon.ad} serisinin parçası</p>
          {detay.koleksiyon.filmler.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {detay.koleksiyon.filmler.map((f) => (
                <Link key={f.id} to={`/film/${f.id}`} className="shrink-0 text-center" style={{ width: 64 }}>
                  {f.posterUrl ? (
                    <img src={f.posterUrl} alt={f.baslik} className="h-24 w-16 rounded-sm object-cover ring-1 ring-cizgi" />
                  ) : (
                    <div className="flex h-24 w-16 items-center justify-center rounded-sm bg-kagit text-[9px] text-kraft ring-1 ring-cizgi">
                      {f.baslik}
                    </div>
                  )}
                  <p className="mt-0.5 truncate text-[10px] text-kraft">{f.yil}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tur === 'sinema' && <FilmMuzigiWidget tmdbId={id} filmAdi={detay.baslik} yil={detay.yil} />}

      {detay.oyuncular?.length > 0 && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Oyuncular</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {detay.oyuncular.map((k) => (
              <Link key={k.id} to={`/kisi/${k.id}`} className="block w-16 shrink-0 text-center">
                <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-kagitKoyu ring-1 ring-cizgi">
                  {k.fotoUrl ? (
                    <img src={k.fotoUrl} alt={k.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-baslik text-lg text-kraft">
                      {k.name[0]}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] text-murekkep">{k.name}</p>
                {k.karakter && <p className="truncate text-[10px] text-kraft">{k.karakter}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {detay.fragmanId && (
        <div className="mt-6">
          {fragmanAcik ? (
            <>
              <h2 className="font-baslik text-lg text-murekkep mb-2">Fragman</h2>
              <div className="aspect-video w-full overflow-hidden rounded-sm ring-1 ring-cizgi">
                <iframe
                  src={`https://www.youtube.com/embed/${detay.fragmanId}?autoplay=1`}
                  title="Fragman"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </>
          ) : (
            <button
              onClick={() => setFragmanAcik(true)}
              className="flex items-center gap-2 rounded-sm bg-kagitKoyu px-4 py-3 font-govde text-sm text-murekkep ring-1 ring-cizgi hover:ring-deniz"
            >
              ▶ Fragmanı Göster
            </button>
          )}
        </div>
      )}

      {detay.gorseller?.length > 0 && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Görseller</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {detay.gorseller.map((g, i) => (
              <img
                key={i}
                src={`https://image.tmdb.org/t/p/w300${g.file_path}`}
                alt=""
                className="h-24 w-40 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
              />
            ))}
          </div>
        </div>
      )}

      {kullanici && (
        <Link
          to={eklemeLinki}
          className="mt-4 inline-block rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit"
        >
          Bu {basliklar[tur]} hakkında günce yaz
        </Link>
      )}

      {detay.benzerler?.length > 0 && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Benzer {tur === 'dizi' ? 'Diziler' : 'Filmler'}</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {detay.benzerler.map((b) => (
              <EserKarti
                key={b.id}
                id={b.id}
                tur={tur}
                baslik={b.title || b.name}
                posterUrl={b.poster_path ? `https://image.tmdb.org/t/p/w300${b.poster_path}` : ''}
                yil={(b.release_date || b.first_air_date)?.slice(0, 4)}
                puan={b.vote_average}
                boyut="kucuk"
              />
            ))}
          </div>
        </div>
      )}

      <div className="defter-cizgi my-6" />

      {tur === 'kitap' && (
        <>
          <h2 className="font-baslik text-lg text-murekkep mb-3">📝 İncelemeler</h2>
          {incelemelerYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {!incelemelerYukleniyor && incelemeler.length === 0 && (
            <p className="text-sm text-kraft">Bu kitap hakkında henüz bir inceleme yazılmadı.</p>
          )}
          {incelemeler.length > 0 && (
            <ul className="space-y-4 mb-6">
              {incelemeler.map((inc) => (
                <li key={inc.id} className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
                  <div className="flex items-center gap-2 text-xs text-kraft">
                    <Link to={`/profil/${inc.yazarId}`} className="flex items-center gap-2">
                      <Avatar adSoyad={inc.yazarAdi} avatarUrl={inc.yazarAvatarUrl} boyut="h-5 w-5" />
                      <span className="font-medium text-murekkep">{inc.yazarAdi}</span>
                    </Link>
                  </div>
                  <Link to={`/gonderi/${inc.id}`} className="block mt-2">
                    <p className="font-baslik text-sm text-murekkep">{inc.baslik}</p>
                    {inc.gunce && <GonderiIcerik metin={inc.gunce} tam={false} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="defter-cizgi my-6" />

          <h2 className="font-baslik text-lg text-murekkep mb-3">💬 Alıntı Duvarı</h2>
          {kullanici && (
            <form onSubmit={alintiPaylas} className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <textarea
                value={yeniAlintiMetni}
                onChange={(e) => setYeniAlintiMetni(e.target.value.slice(0, 400))}
                placeholder="Beğendiğin bir alıntıyı buraya yaz..."
                rows={3}
                maxLength={400}
                className="w-full rounded-sm bg-kagit px-2 py-1 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <p className="text-right text-[11px] text-kraft">{yeniAlintiMetni.length}/400</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={yeniAlintiSayfa}
                  onChange={(e) => setYeniAlintiSayfa(e.target.value)}
                  placeholder="Sayfa (opsiyonel)"
                  className="w-32 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
                <button
                  type="submit"
                  disabled={alintiKaydediliyor || !yeniAlintiMetni.trim()}
                  className="ml-auto rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                >
                  {alintiKaydediliyor ? 'Paylaşılıyor...' : 'Paylaş'}
                </button>
              </div>
            </form>
          )}

          {alintilarYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {!alintilarYukleniyor && alintilar.length === 0 && (
            <p className="text-sm text-kraft">Bu kitaptan henüz alıntı paylaşılmadı.</p>
          )}
          <ul className="space-y-3">
            {(alintilarTumunuGorAcik ? alintilar : alintilar.slice(0, 5)).map((a) => (
              <AlintiKarti
                key={a.id}
                alinti={a}
                kullanici={kullanici}
                onBegenTiklandi={alintiBegenTiklandi}
                onSilTiklandi={alintiSilTiklandi}
                kapakGoster={false}
              />
            ))}
          </ul>
          {alintilar.length > 5 && (
            <button
              onClick={() => setAlintilarTumunuGorAcik((a) => !a)}
              className="mt-2 mb-6 text-xs text-kraft hover:text-deniz hover:underline"
            >
              {alintilarTumunuGorAcik ? '↑ Daha Az Göster' : `Tümünü Gör (${alintilar.length}) →`}
            </button>
          )}
          {alintilar.length <= 5 && <div className="mb-6" />}

          <div className="defter-cizgi my-6" />
        </>
      )}

      <h2 className="font-baslik text-lg text-murekkep mb-3">Topluluk Güncesi</h2>
      {gonderilerYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!gonderilerYukleniyor && gonderiler.length === 0 && (
        <p className="text-sm text-kraft">Bu {basliklar[tur]} hakkında henüz kimse günce yazmadı.</p>
      )}

      <ul className="space-y-4">
        {gonderiler.map((g) => (
          <li key={g.id} className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <div className="flex items-center gap-2 text-xs text-kraft">
              <Link to={`/profil/${g.yazarId}`} className="flex items-center gap-2">
                <Avatar adSoyad={g.yazarAdi} avatarUrl={g.yazarAvatarUrl} boyut="h-5 w-5" />
                <span className="font-medium text-murekkep">{g.yazarAdi}</span>
              </Link>
              {g.kullaniciPuani && (
                <>
                  <span>·</span>
                  <YildizPuan puan={g.kullaniciPuani} boyut="text-xs" />
                </>
              )}
            </div>
            {g.gunce && (
              <Link to={`/gonderi/${g.id}`} className="block mt-2">
                <GonderiIcerik metin={g.gunce} tam={false} />
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="defter-cizgi my-6" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Yorumlar</h2>
      {yorumlarYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yorumlarYukleniyor && yorumlar.length === 0 && <p className="text-sm text-kraft">Henüz yorum yok — ilkini sen yaz.</p>}

      <ul className="space-y-3 mb-4">
        {yorumlar.map((y) => (
          <li key={y.id} className="group flex items-start gap-2 text-sm">
            <Avatar adSoyad={y.yazarAdi} avatarUrl={y.yazarAvatarUrl} boyut="h-6 w-6" />
            <div className="min-w-0 flex-1">
              <Link to={`/profil/${y.yazarId}`} className="font-medium text-murekkep hover:underline">
                {y.yazarAdi}
              </Link>{' '}
              <span className="whitespace-pre-wrap text-murekkep/90">{y.metin}</span>
            </div>
            {kullanici?.uid === y.yazarId && (
              <button
                onClick={() => yorumSilTiklandi(y.id)}
                className="shrink-0 text-xs text-kraft opacity-0 transition-opacity hover:text-muhur group-hover:opacity-100"
              >
                Sil
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={yorumGonder} className="space-y-2">
        <textarea
          value={yeniYorum}
          onChange={(e) => setYeniYorum(e.target.value)}
          placeholder={kullanici ? 'Bir yorum yaz — kısa bir cümle de olur, uzun bir düşünce de...' : 'Yorum yapmak için giriş yap'}
          disabled={!kullanici}
          rows={3}
          className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!kullanici || yorumGonderiliyor || !yeniYorum.trim()}
          className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
        >
          {yorumGonderiliyor ? 'Gönderiliyor...' : 'Yorum Yap'}
        </button>
      </form>
    </div>
  )
}
