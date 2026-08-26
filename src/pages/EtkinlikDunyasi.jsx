import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import HabercKarti from '../components/HabercKarti.jsx'
import SanatEserleriKesfet from '../components/SanatEserleriKesfet.jsx'
import EtkinlikleriKesfet from '../components/EtkinlikleriKesfet.jsx'
import EtkinlikOneCikanlar from '../components/EtkinlikOneCikanlar.jsx'
import { ETKINLIK_TURLERI } from '../data/etkinlikTurleri.js'
import { habercEkle, habercileriGetir, katilimDegistir, habercSil } from '../utils/etkinlikHabercisi.js'

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
  instagramUrl: '',
}

export default function EtkinlikDunyasi() {
  const { kullanici, profil } = useAuth()
  const { gonderiler: etkinlikler, yukleniyor: etkinlikYukleniyor, dahaFazlaVarMi, dahaFazlaYukle } = useGonderiler({ tur: 'etkinlik' })
  const [oneCikanSayisi, setOneCikanSayisi] = useState(0)
  const [oneCikanYenile, setOneCikanYenile] = useState(0)

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

      <SanatEserleriKesfet />

      <EtkinlikOneCikanlar yenidenYukle={oneCikanYenile} onSayiDegisti={setOneCikanSayisi} />

      <EtkinlikleriKesfet oneCikanSayisi={oneCikanSayisi} onOneCikanDegisti={() => setOneCikanYenile((n) => n + 1)} />

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
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">📷 İlgili Sosyal Medya Gönderisi (opsiyonel)</label>
              <input
                value={form.instagramUrl}
                onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                placeholder="https://www.instagram.com/p/..."
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
        {!etkinlikYukleniyor && dahaFazlaVarMi && (
          <button
            onClick={dahaFazlaYukle}
            className="mt-4 rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-sm text-kraft ring-1 ring-cizgi hover:text-murekkep"
          >
            Daha Fazla Göster
          </button>
        )}
      </div>
    </div>
  )
}
