import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import { ETKINLIK_TURLERI } from '../data/etkinlikTurleri.js'
import { habercEkle, habercileriGetir, katilimDegistir, habercSil } from '../utils/etkinlikHabercisi.js'

function gunSayisi(tarih) {
  if (!tarih) return null
  const fark = new Date(tarih) - new Date(new Date().toISOString().slice(0, 10))
  return Math.round(fark / (1000 * 60 * 60 * 24))
}

function tarihKisa(tarih) {
  return new Date(tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function HabercKarti({ haberci, kullanici, onKatilimDegistir, onSil }) {
  const gun = gunSayisi(haberci.ilkTarih)
  const biletGunu = gunSayisi(haberci.biletSatisTarihi)
  const katiliyorMu = kullanici && haberci.katilacaklar.includes(kullanici.uid)
  const tekTarih = haberci.tarihler.length === 1

  return (
    <div className="flex gap-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      {haberci.gorselUrl && (
        <img src={haberci.gorselUrl} alt={haberci.baslik} className="h-24 w-16 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="rounded-full bg-kagit px-2 py-0.5 text-[11px] text-kraft ring-1 ring-cizgi">{haberci.tur}</span>
            <h3 className="mt-1 font-baslik text-lg text-murekkep">{haberci.baslik}</h3>
            <p className="text-xs text-kraft">{[haberci.mekan, haberci.sehir].filter(Boolean).join(', ')}</p>
            <p className="mt-0.5 text-xs text-kraft">
              {tekTarih ? (
                <>
                  {new Date(haberci.ilkTarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {gun != null && ` · ${gun === 0 ? 'Bugün' : gun > 0 ? `${gun} gün sonra` : 'Geçti'}`}
                </>
              ) : (
                <>
                  {haberci.tarihler.map(tarihKisa).join(' · ')}
                  {gun != null && gun >= 0 && ` · ilki ${gun === 0 ? 'bugün' : `${gun} gün sonra`}`}
                </>
              )}
            </p>
          </div>
          {kullanici?.uid === haberci.ekleyenId && (
            <button onClick={() => onSil(haberci.id)} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
              Sil
            </button>
          )}
        </div>

        {haberci.biletSatisTarihi && biletGunu != null && biletGunu > 0 && (
          <p className="mt-2 text-xs text-gise">
            🎫 Bilet satışı {new Date(haberci.biletSatisTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihinde başlıyor
          </p>
        )}

        {haberci.bilgi && <p className="mt-2 text-sm text-murekkep leading-relaxed">{haberci.bilgi}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {haberci.satisLinki && (
            <a
              href={haberci.satisLinki}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit hover:opacity-90"
            >
              🎟️ Bilet Al →
            </a>
          )}
          {kullanici && (
            <button
              onClick={() => onKatilimDegistir(haberci)}
              className={`rounded-sm px-3 py-1.5 font-govde text-xs ${
                katiliyorMu ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
              }`}
            >
              {katiliyorMu ? '✓ Katılıyorum' : '✋ Katılacağım'}
            </button>
          )}
          {haberci.katilacaklar.length > 0 && <span className="text-xs text-kraft">{haberci.katilacaklar.length} kişi katılıyor</span>}
          <span className="ml-auto text-[11px] text-kraft">{haberci.ekleyenAdi} paylaştı</span>
        </div>
      </div>
    </div>
  )
}

const BOS_FORM = {
  baslik: '',
  sehir: '',
  mekan: '',
  gorselUrl: '',
  tur: 'Konser',
  tarihler: [''],
  biletSatisTarihi: '',
  satisLinki: '',
  bilgi: '',
}

export default function EtkinlikDunyasi() {
  const { kullanici, profil } = useAuth()
  const { gonderiler: etkinlikler, yukleniyor: etkinlikYukleniyor } = useGonderiler({ tur: 'etkinlik' })

  const [habercler, setHaberciler] = useState([])
  const [habercYukleniyor, setHabercYukleniyor] = useState(true)
  const [formuAcik, setFormuAcik] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [form, setForm] = useState(BOS_FORM)

  async function hepsiniYukle() {
    setHabercYukleniyor(true)
    const liste = await habercileriGetir()
    setHaberciler(liste)
    setHabercYukleniyor(false)
  }

  useEffect(() => {
    hepsiniYukle()
  }, [])

  function tarihGuncelle(i, deger) {
    setForm((f) => ({ ...f, tarihler: f.tarihler.map((t, idx) => (idx === i ? deger : t)) }))
  }
  function tarihEkle() {
    setForm((f) => ({ ...f, tarihler: [...f.tarihler, ''] }))
  }
  function tarihKaldir(i) {
    setForm((f) => ({ ...f, tarihler: f.tarihler.filter((_, idx) => idx !== i) }))
  }

  async function habercEkleTiklandi(e) {
    e.preventDefault()
    const gecerliTarihler = form.tarihler.filter(Boolean)
    if (!form.baslik.trim() || gecerliTarihler.length === 0 || !kullanici) return
    setKaydediliyor(true)
    try {
      await habercEkle(kullanici, profil, { ...form, tarihler: gecerliTarihler })
      setForm(BOS_FORM)
      setFormuAcik(false)
      hepsiniYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function katilimDegistirTiklandi(haberci) {
    if (!kullanici) return
    const katiliyorMu = haberci.katilacaklar.includes(kullanici.uid)
    setHaberciler((liste) =>
      liste.map((h) =>
        h.id === haberci.id
          ? { ...h, katilacaklar: katiliyorMu ? h.katilacaklar.filter((u) => u !== kullanici.uid) : [...h.katilacaklar, kullanici.uid] }
          : h
      )
    )
    await katilimDegistir(haberci.id, kullanici.uid, katiliyorMu)
  }

  async function silTiklandi(habercId) {
    if (!window.confirm('Bu duyuruyu silmek istediğine emin misin?')) return
    await habercSil(habercId)
    setHaberciler((liste) => liste.filter((h) => h.id !== habercId))
  }

  return (
    <div>
      <img
        src="/gorseller/etkinlik-banner.png"
        alt="Tiyatro, Opera, Bale, Konser, Festival, Müze Dünyası — Keşfet, Deneyimle ve Paylaş"
        className="mb-3 w-full rounded-sm ring-1 ring-cizgi"
      />
      <div className="mb-6 flex justify-center">
        <Link
          to="/gonderi-ekle?tur=etkinlik"
          className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit hover:opacity-90"
        >
          + Etkinlik Ekle
        </Link>
      </div>

      <h1 className="font-baslik text-2xl text-murekkep mb-1">Etkinlik Dünyası</h1>
      <p className="mb-6 text-sm text-kraft">Tiyatro, opera, bale, konser, festival, müze, sergi ve daha fazlası.</p>

      {/* Etkinlik Habercisi — ileriye dönük duyuru panosu, aşağıdaki "yaşadım"
          güncelerinden farklı olarak henüz olmamış etkinlikleri haber veriyor */}
      <div className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-baslik text-lg text-murekkep">📢 Etkinlik Habercisi</h2>
          {kullanici && (
            <button onClick={() => setFormuAcik((a) => !a)} className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit">
              {formuAcik ? 'Vazgeç' : '+ Duyuru Ekle'}
            </button>
          )}
        </div>

        {formuAcik && (
          <form onSubmit={habercEkleTiklandi} className="mb-6 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Etkinlik Adı</label>
                <input
                  value={form.baslik}
                  onChange={(e) => setForm((f) => ({ ...f, baslik: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tür</label>
                <select
                  value={form.tur}
                  onChange={(e) => setForm((f) => ({ ...f, tur: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                >
                  {ETKINLIK_TURLERI.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Mekan</label>
                <input
                  value={form.mekan}
                  onChange={(e) => setForm((f) => ({ ...f, mekan: e.target.value }))}
                  placeholder="ör. Zorlu PSM"
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Şehir</label>
                <input
                  value={form.sehir}
                  onChange={(e) => setForm((f) => ({ ...f, sehir: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                Tarih{form.tarihler.length > 1 && 'ler'}{' '}
                <span className="normal-case text-[10px]">(aynı yerde birden fazla gösterim varsa ekle)</span>
              </label>
              <div className="space-y-1.5">
                {form.tarihler.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="date"
                      value={t}
                      onChange={(e) => tarihGuncelle(i, e.target.value)}
                      className="w-40 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                    {form.tarihler.length > 1 && (
                      <button type="button" onClick={() => tarihKaldir(i)} className="text-xs text-kraft hover:text-muhur">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={tarihEkle} className="mt-1.5 text-[11px] text-kraft hover:text-deniz hover:underline">
                + Tarih Ekle
              </button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Bilet Satış Tarihi (opsiyonel)</label>
                <input
                  type="date"
                  value={form.biletSatisTarihi}
                  onChange={(e) => setForm((f) => ({ ...f, biletSatisTarihi: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Etkinlik Görseli URL'i (opsiyonel)</label>
                <input
                  value={form.gorselUrl}
                  onChange={(e) => setForm((f) => ({ ...f, gorselUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Bilet Satış Linki (opsiyonel)</label>
              <input
                value={form.satisLinki}
                onChange={(e) => setForm((f) => ({ ...f, satisLinki: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Etkinlik Hakkında Bilgi (opsiyonel)</label>
              <textarea
                value={form.bilgi}
                onChange={(e) => setForm((f) => ({ ...f, bilgi: e.target.value }))}
                rows={3}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>

            <button
              type="submit"
              disabled={kaydediliyor || !form.baslik.trim() || form.tarihler.filter(Boolean).length === 0}
              className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {kaydediliyor ? 'Ekleniyor...' : 'Duyuruyu Yayınla'}
            </button>
          </form>
        )}

        {habercYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!habercYukleniyor && habercler.length === 0 && <p className="text-sm text-kraft">Şu an duyurulmuş bir etkinlik yok.</p>}
        <div className="space-y-3">
          {habercler.map((h) => (
            <HabercKarti key={h.id} haberci={h} kullanici={kullanici} onKatilimDegistir={katilimDegistirTiklandi} onSil={silTiklandi} />
          ))}
        </div>
      </div>

      <div className="defter-cizgi my-8" />

      <div>
        <h2 className="font-baslik text-lg text-murekkep mb-3">Topluluğumuzun Etkinlikleri</h2>
        {etkinlikYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!etkinlikYukleniyor && etkinlikler.length === 0 && <p className="text-sm text-kraft">Henüz bir etkinlik paylaşımı yok.</p>}
        <div className="space-y-4">
          {etkinlikler.map((e, i) => (
            <div key={e.id}>
              <GonderiKarti gonderi={e} />
              {i < etkinlikler.length - 1 && <div className="defter-cizgi mt-4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
