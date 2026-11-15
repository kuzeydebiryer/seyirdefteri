import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTumGelecekEtkinlikler } from '../hooks/useTumGelecekEtkinlikler.js'
import { kulupPuanlariniGetir } from '../utils/kulupPuanlari.js'

// Anasayfadaki sinema topluluğu vitrini ("Ta'da Yeni Bir Şey Yok" gibi): topluluğun
// son film inceleme etkinliklerini, üyelerin Eleştirmenler bölümünde verdiği
// 10 üzerinden puanlarla yan yana gösterir; yaklaşan filmde puanlar "-" ve
// posterin üstünde "YARIN" / "BUGÜN" / tarih bandı olur. Veri, etkinlik
// kartındaki Eleştirmenler ızgarasıyla (bkz. ElestirmenIzgarasi.jsx) AYNI
// kaynak — ayrıca bir şey girmek gerekmiyor.
const SON_FILM_SAYISI = 3

// "ÖZGÜR ÇAKICI" gibi tamamı büyük harfle kayıtlı adları "Özgür" biçimine çevirir.
function adiDuzelt(s) {
  if (!s) return ''
  if (s.length > 1 && s === s.toLocaleUpperCase('tr-TR')) {
    return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1).toLocaleLowerCase('tr-TR')
  }
  return s
}

// Otomatik kuralın istediğin adı vermediği kişiler için elle belirlenen kısa adlar
// (anahtar = @kullanıcı adı). Yeni üye eklenince buraya satır eklemek yeter;
// eklenmezse otomatik kural devreye girer.
const KISA_AD_ISTISNALARI = {
  kuzeydebiryer: 'Serkan',
  serkanmutlu: 'Serkan M.',
  jeanjacksina: 'Aykut',
  akboynuz: 'Özgür',
}

// Kutularda yer az: sadece ilk ad ("Özgür", "Aykut"); aynı ilk ada sahip iki kişi
// varsa (iki Serkan) soyadının baş harfi eklenir ("Serkan M.", "Serkan S.").
function kisaAdlariUret(uyeler) {
  const ilkAdlar = uyeler.map((u) => adiDuzelt((u.kullaniciAdi || '').trim().split(/\s+/)[0]))
  const sayac = {}
  ilkAdlar.forEach((a) => (sayac[a] = (sayac[a] || 0) + 1))
  const sonuc = {}
  uyeler.forEach((u, i) => {
    const parcalar = (u.kullaniciAdi || '').trim().split(/\s+/)
    const soyadBasi = parcalar.length > 1 ? adiDuzelt(parcalar[parcalar.length - 1]).charAt(0) : ''
    const otomatik = sayac[ilkAdlar[i]] > 1 && soyadBasi ? `${ilkAdlar[i]} ${soyadBasi}.` : ilkAdlar[i]
    sonuc[u.kullaniciId] = KISA_AD_ISTISNALARI[u.kullaniciAdiKisa] || otomatik
  })
  return sonuc
}

function puanGoster(puan) {
  if (puan == null) return '-'
  const onluk = puan * 2
  return Number.isInteger(onluk) ? String(onluk) : onluk.toFixed(1)
}

function bantMetni(iso) {
  const d = new Date(iso)
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const gun = new Date(d)
  gun.setHours(0, 0, 0, 0)
  const fark = Math.round((gun - bugun) / 86400000)
  if (fark <= 0) return 'BUGÜN'
  if (fark === 1) return 'YARIN'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }).toLocaleUpperCase('tr-TR')
}

function filmLinki(e) {
  return e.eserTur === 'dizi' ? `/dizi/${e.eserTmdbId}` : `/film/${e.eserTmdbId}`
}

export default function KulupPuanVitrini() {
  const { etkinlikler, yukleniyor } = useTumGelecekEtkinlikler()
  const [vitrinler, setVitrinler] = useState([])

  useEffect(() => {
    if (yukleniyor) return
    let iptal = false
    async function hazirla() {
      const simdi = Date.now()
      const filmler = etkinlikler.filter((e) => e.topluluklTur === 'Sinema' && e.eserTmdbId && e.eserTur !== 'kitap' && e.tarih)
      const topluluklar = new Map()
      filmler.forEach((e) => {
        if (!topluluklar.has(e.topluluklId)) topluluklar.set(e.topluluklId, { id: e.topluluklId, ad: e.topluluklAd, etkinlikler: [] })
        topluluklar.get(e.topluluklId).etkinlikler.push(e)
      })

      const sonuc = []
      for (const t of topluluklar.values()) {
        const gecmis = t.etkinlikler.filter((e) => new Date(e.tarih).getTime() < simdi).sort((a, b) => b.tarih.localeCompare(a.tarih))
        const yaklasan = t.etkinlikler.filter((e) => new Date(e.tarih).getTime() >= simdi).sort((a, b) => a.tarih.localeCompare(b.tarih))[0]

        // Eleştirisi olan son filmleri bulmak için son birkaç geçmiş etkinliğe bakıyoruz.
        const adaylar = gecmis.slice(0, SON_FILM_SAYISI + 2)
        const adayElestirileri = await Promise.all(adaylar.map((e) => kulupPuanlariniGetir(e).catch(() => [])))
        const kartlar = adaylar
          .map((e, i) => ({ etkinlik: e, elestiriler: adayElestirileri[i], yaklasanMi: false }))
          .filter((k) => k.elestiriler.length > 0)
          .slice(0, SON_FILM_SAYISI)
        if (yaklasan) {
          // Yaklaşan filmi bazı üyeler zaten izleyip puanlamış olabilir; varsa onlar da görünür.
          const onceden = await kulupPuanlariniGetir(yaklasan).catch(() => [])
          kartlar.push({ etkinlik: yaklasan, elestiriler: onceden, yaklasanMi: true })
        }
        if (kartlar.length === 0) continue

        // Tüm kartlarda aynı üye sırası: görünen tüm eleştirmenlerin birleşimi.
        // Üyeler puan vermemiş olsa bile "-" ile görünsün diye kulübün tüm üyeleri
        // yerine yalnızca en az bir kez puan vermiş olanlar alınıyor.
        const uyeHaritasi = new Map()
        kartlar.forEach((k) => k.elestiriler.forEach((el) => uyeHaritasi.set(el.kullaniciId, el)))
        const kisaAdlar = kisaAdlariUret([...uyeHaritasi.values()])
        const uyeler = [...uyeHaritasi.keys()]
          .map((uid) => ({ uid, ad: kisaAdlar[uid] }))
          .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
        sonuc.push({ topluluk: t, kartlar, uyeler })
      }
      if (!iptal) setVitrinler(sonuc)
    }
    hazirla().catch((err) => console.error('Kulüp puan vitrini yüklenemedi:', err))
    return () => {
      iptal = true
    }
  }, [yukleniyor, etkinlikler])

  if (vitrinler.length === 0) return null

  return (
    <>
      {vitrinler.map(({ topluluk, kartlar, uyeler }) => (
        <div key={topluluk.id} className="mb-10">
          <Link to={`/topluluk/${topluluk.id}`} className="mb-3 block font-baslik text-lg text-gise hover:underline">
            {topluluk.ad}
          </Link>
          <div className="space-y-3">
            {kartlar.map(({ etkinlik: e, elestiriler, yaklasanMi }) => (
              <Link key={e.id} to={filmLinki(e)} className="flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <div className="relative h-28 w-[4.5rem] shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                  {e.eserPosterUrl && <img src={e.eserPosterUrl} alt={e.eserBaslik} className="h-full w-full object-cover" />}
                  {yaklasanMi && (
                    <span className="absolute inset-x-0 top-0 bg-gise py-0.5 text-center font-govde text-[10px] font-bold text-murekkep">
                      {bantMetni(e.tarih)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 self-center">
                  <p className="truncate font-baslik text-lg leading-tight text-murekkep">{e.eserBaslik}</p>
                  {uyeler.length > 0 && (
                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {uyeler.map((u) => {
                        const puan = elestiriler.find((el) => el.kullaniciId === u.uid)?.puan
                        return (
                          <p key={u.uid} className="truncate font-govde text-sm text-murekkep">
                            {u.ad}: <span className="font-bold text-gise">{puanGoster(puan)}</span>
                          </p>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
