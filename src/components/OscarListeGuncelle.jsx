import { useMemo, useState } from 'react'
import { adayEkle, adayGuncelle, adaySil, kategoriEkle } from '../utils/oscar.js'
import { adayiCoz, eslesenMevcut, kategoriEsle, listeyiCoz } from '../utils/oscarListeGuncelle.js'

// 🔄 Listeyi Güncelle: yapıştırılan güncel tahmin listesini mevcut sezonla eşitler.
// 1) Yapıştır → 2) Önizle (kalan / yeni / çıkan, çıkan adaylara verilmiş tahmin sayısı)
// → 3) Uygula. Kalan adayların kimliği değişmez, böylece kulübün tahminleri korunur.

async function havuzla(isler, esZamanli, ilerle) {
  const sonuc = new Array(isler.length)
  let sira = 0
  let biten = 0
  async function isci() {
    while (sira < isler.length) {
      const i = sira++
      sonuc[i] = await isler[i]()
      ilerle(++biten, isler.length)
    }
  }
  await Promise.all(Array.from({ length: esZamanli }, isci))
  return sonuc
}

function farkHesapla(planKategori, adaylar, tahminler) {
  const mevcutlar = planKategori.hedefId ? adaylar.filter((a) => a.kategoriId === planKategori.hedefId) : []
  const kullanilan = new Set()
  const kalanlar = []
  const yeniler = []
  planKategori.cozulenler.forEach((c, sira) => {
    const m = eslesenMevcut(c, mevcutlar, planKategori.kisiBirincil, kullanilan)
    if (m) {
      kullanilan.add(m.id)
      kalanlar.push({ mevcut: m, c, sira })
    } else yeniler.push({ c, sira })
  })
  const cikanlar = mevcutlar
    .filter((a) => !kullanilan.has(a.id))
    .map((a) => ({ aday: a, tahminSayisi: tahminler.filter((t) => t.adayId === a.id).length }))
  return { kalanlar, yeniler, cikanlar }
}

const adGoster = (alanlar, kisiBirincil) =>
  kisiBirincil ? `${alanlar.kisiAdi} – ${alanlar.filmBasligi}` : `${alanlar.filmBasligi}${alanlar.kisiAdi ? ` – ${alanlar.kisiAdi}` : ''}`

export default function OscarListeGuncelle({ sezon, kategoriler, adaylar, tahminler, tur = 'film', onBitti }) {
  const [metin, setMetin] = useState('')
  const [asama, setAsama] = useState('giris')
  const [ilerleme, setIlerleme] = useState('')
  const [plan, setPlan] = useState([])
  const [hata, setHata] = useState('')
  const torenYili = Number(String(sezon?.torenTarihi || '').slice(0, 4)) || new Date().getFullYear() + 1

  async function onizle() {
    setHata('')
    const liste = listeyiCoz(metin)
    if (liste.length === 0) return setHata('Listede kategori bulunamadı. Kategori adı satırı + altında "1. …" satırları olmalı.')
    setAsama('cozuluyor')
    const isler = []
    liste.forEach((k, ki) => k.adaylar.forEach((a, ai) => isler.push({ ki, ai, is: () => adayiCoz(a, k.kisiBirincil, tur, torenYili) })))
    const sonuclar = await havuzla(
      isler.map((x) => x.is),
      4,
      (b, t) => setIlerleme(`TMDB'de eşleniyor… ${b}/${t}`)
    )
    const yeniPlan = liste.map((k) => ({
      ad: k.ad,
      kisiBirincil: k.kisiBirincil,
      hedefId: kategoriEsle(k.ad, kategoriler)?.id || null,
      uygula: true,
      cozulenler: [],
    }))
    isler.forEach((x, i) => (yeniPlan[x.ki].cozulenler[x.ai] = sonuclar[i]))
    setPlan(yeniPlan)
    setAsama('onizleme')
    setIlerleme('')
  }

  const farklar = useMemo(() => plan.map((k) => farkHesapla(k, adaylar, tahminler)), [plan, adaylar, tahminler])
  const ozet = farklar.reduce(
    (t, f, i) =>
      plan[i].uygula
        ? {
            yeni: t.yeni + f.yeniler.length,
            cikan: t.cikan + f.cikanlar.length,
            kalan: t.kalan + f.kalanlar.length,
            tahmin: t.tahmin + f.cikanlar.reduce((n, c) => n + c.tahminSayisi, 0),
          }
        : t,
    { yeni: 0, cikan: 0, kalan: 0, tahmin: 0 }
  )
  const eslenenIdler = new Set(plan.map((k) => k.hedefId).filter(Boolean))
  const dokunulmayan = kategoriler.filter((k) => !eslenenIdler.has(k.id))

  async function uygula() {
    setAsama('uygulaniyor')
    setHata('')
    let yeniKategoriSira = kategoriler.length
    try {
      for (let i = 0; i < plan.length; i++) {
        const k = plan[i]
        if (!k.uygula) continue
        const f = farklar[i]
        setIlerleme(`${i + 1}/${plan.length} · ${k.ad}`)
        let katId = k.hedefId
        if (!katId) katId = (await kategoriEkle(sezon.id, { ad: k.ad, sira: yeniKategoriSira++ })).id
        await Promise.all([
          ...f.kalanlar.map(({ mevcut, c, sira }) =>
            adayGuncelle(mevcut.id, k.kisiBirincil ? { sira } : { sira, kisiAdi: c.alanlar.kisiAdi || mevcut.kisiAdi || '' })
          ),
          ...f.yeniler.map(({ c, sira }) => adayEkle(sezon.id, katId, { ...c.alanlar, sira })),
          ...f.cikanlar.map(({ aday }) => adaySil(aday.id)),
        ])
      }
      setAsama('bitti')
      setIlerleme('')
      onBitti?.()
    } catch (e) {
      setHata(`Uygulanırken hata: ${e.message}. Sayfayı yenileyip önizlemeyi tekrar yapabilirsin; tamamlanan kısımlar korunur.`)
      setAsama('onizleme')
    }
  }

  const planGuncelle = (i, alan, deger) => setPlan((p) => p.map((k, j) => (j === i ? { ...k, [alan]: deger } : k)))

  if (asama === 'bitti') {
    return (
      <div className="max-w-2xl rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
        <p className="text-sm text-murekkep">
          ✓ Liste güncellendi: {ozet.kalan} aday korundu, {ozet.yeni} aday eklendi, {ozet.cikan} aday çıkarıldı.
        </p>
        {ozet.tahmin > 0 && (
          <p className="mt-1 text-xs text-muhur">
            Çıkan adaylara verilmiş {ozet.tahmin} tahmin boşa düştü. Bu üyeler ilgili kategoride "tahminin listeden çıktı" uyarısı görecek ve yeniden seçebilecek.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      {(asama === 'giris' || asama === 'cozuluyor') && (
        <>
          <p className="text-xs leading-relaxed text-kraft">
            Tahmin sitesinden kopyaladığın <b className="text-murekkep">güncel listenin tamamını</b> yapıştır (ör. oscarboy). Biçim: kategori adı, altında
            "1. Film" satırları. Oyuncu/yönetmen kategorilerinde "1. Kişi – Film", diğerlerinde "1. Film – Kişi/Şarkı/Ülke". Önce bir önizleme
            gösterilir; mevcut adaylar korunur, sadece değişenler işlenir.
          </p>
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            rows={12}
            disabled={asama === 'cozuluyor'}
            placeholder={'En İyi Film\n1. The Odyssey\n2. La bola negra\nEn İyi Yönetmen\n1. Christopher Nolan – The Odyssey\nEn İyi Özgün Şarkı\n1. La bola negra – “La nieve”'}
            className="w-full rounded-sm bg-kagit px-3 py-2 text-xs text-murekkep ring-1 ring-cizgi"
          />
          <button
            type="button"
            onClick={onizle}
            disabled={!metin.trim() || asama === 'cozuluyor'}
            className="rounded-sm bg-deniz px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {asama === 'cozuluyor' ? ilerleme || 'Hazırlanıyor…' : '🔍 Önizle'}
          </button>
        </>
      )}

      {(asama === 'onizleme' || asama === 'uygulaniyor') && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-kagit px-2 py-0.5 text-murekkep ring-1 ring-cizgi">= {ozet.kalan} korunacak</span>
            <span className="rounded-full bg-kagit px-2 py-0.5 text-deniz ring-1 ring-cizgi">+ {ozet.yeni} eklenecek</span>
            <span className="rounded-full bg-kagit px-2 py-0.5 text-muhur ring-1 ring-cizgi">− {ozet.cikan} çıkacak</span>
            {ozet.tahmin > 0 && <span className="text-muhur">⚠ çıkanlara verilmiş {ozet.tahmin} tahmin boşa düşecek</span>}
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {plan.map((k, i) => {
              const f = farklar[i]
              const degisiklikYok = f.yeniler.length === 0 && f.cikanlar.length === 0
              return (
                <div key={i} className={`rounded-sm bg-kagit p-2 ring-1 ring-cizgi ${k.uygula ? '' : 'opacity-50'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-murekkep">
                      <input type="checkbox" checked={k.uygula} onChange={(e) => planGuncelle(i, 'uygula', e.target.checked)} />
                      <b>{k.ad}</b>
                    </label>
                    <span className="text-[11px] text-kraft">→</span>
                    <select
                      value={k.hedefId || ''}
                      onChange={(e) => planGuncelle(i, 'hedefId', e.target.value || null)}
                      className="rounded-sm bg-kagitKoyu px-1.5 py-0.5 text-[11px] text-murekkep ring-1 ring-cizgi"
                    >
                      <option value="">+ Yeni kategori oluştur</option>
                      {kategoriler.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.ad}
                        </option>
                      ))}
                    </select>
                    {degisiklikYok && k.hedefId && <span className="text-[11px] text-kraft">değişiklik yok (yalnızca sıra)</span>}
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[11px]">
                    {f.yeniler.map(({ c, sira }) => (
                      <li key={`y${sira}`} className="text-deniz">
                        + {adGoster(c.alanlar, k.kisiBirincil)}
                        {c.filmBulundu ? (
                          <span className="text-kraft">
                            {' '}
                            (TMDB: {c.alanlar.filmBasligi}
                            {c.alanlar.filmYili && `, ${c.alanlar.filmYili}`})
                          </span>
                        ) : (
                          <span className="text-muhur"> ⚠ TMDB'de film bulunamadı — afişsiz eklenecek</span>
                        )}
                        {!c.kisiBulundu && <span className="text-muhur"> ⚠ kişi bulunamadı — fotoğrafsız</span>}
                      </li>
                    ))}
                    {f.cikanlar.map(({ aday, tahminSayisi }) => (
                      <li key={aday.id} className="text-muhur">
                        − {adGoster(aday, k.kisiBirincil)}
                        {tahminSayisi > 0 && <span> · {tahminSayisi} tahmin</span>}
                      </li>
                    ))}
                    {f.kalanlar.length > 0 && (
                      <li className="text-kraft">= {f.kalanlar.map(({ mevcut }) => (k.kisiBirincil ? mevcut.kisiAdi : mevcut.filmBasligi)).join(', ')}</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>

          {dokunulmayan.length > 0 && (
            <p className="text-[11px] text-kraft">Listede olmayan kategoriler (dokunulmayacak): {dokunulmayan.map((k) => k.ad).join(', ')}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={uygula}
              disabled={asama === 'uygulaniyor'}
              className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {asama === 'uygulaniyor' ? `Uygulanıyor… ${ilerleme}` : '✓ Değişiklikleri uygula'}
            </button>
            <button
              type="button"
              onClick={() => setAsama('giris')}
              disabled={asama === 'uygulaniyor'}
              className="rounded-sm bg-kagit px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi"
            >
              ← Listeyi düzenle
            </button>
          </div>
        </>
      )}
      {hata && <p className="text-xs text-muhur">{hata}</p>}
    </div>
  )
}
