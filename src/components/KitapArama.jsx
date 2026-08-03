import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { kitapFiltrele, tumKategorileriGetir, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'

export default function KitapArama() {
  const navigate = useNavigate()
  const [kategoriler, setKategoriler] = useState([])
  const [acik, setAcik] = useState(false)
  const [form, setForm] = useState({ metin: '', kategori: '', yilBaslangic: '', yilBitis: '', sayfaMin: '', sayfaMaks: '' })
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [aramaYapildi, setAramaYapildi] = useState(false)
  const [inceleniyorId, setInceleniyorId] = useState(null)

  useEffect(() => {
    tumKategorileriGetir().then((liste) => setKategoriler(liste.slice(0, 40)))
  }, [])

  async function ara(e) {
    e.preventDefault()
    setYukleniyor(true)
    setAramaYapildi(true)
    try {
      const liste = await kitapFiltrele(form, 60)
      setSonuclar(liste)
    } finally {
      setYukleniyor(false)
    }
  }

  async function incele(kitap) {
    setInceleniyorId(kitap.id)
    try {
      const kaydedilen = await turkceKitaptanKaydet(kitap)
      navigate(`/kitap/${kaydedilen.id}`)
    } finally {
      setInceleniyorId(null)
    }
  }

  function temizle() {
    setForm({ metin: '', kategori: '', yilBaslangic: '', yilBitis: '', sayfaMin: '', sayfaMaks: '' })
    setSonuclar([])
    setAramaYapildi(false)
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">Kitap Ara ve Filtrele</h2>
        <button onClick={() => setAcik((a) => !a)} className="text-xs text-kraft hover:text-deniz hover:underline">
          {acik ? '▲ Filtreleri Gizle' : '▼ Filtreleri Göster'}
        </button>
      </div>

      <form onSubmit={ara} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={form.metin}
            onChange={(e) => setForm((f) => ({ ...f, metin: e.target.value }))}
            placeholder="Kitap adı ya da yazar ara..."
            className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button type="submit" disabled={yukleniyor} className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit disabled:opacity-40">
            {yukleniyor ? 'Aranıyor...' : 'Ara'}
          </button>
        </div>

        {acik && (
          <div className="space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Kategori</label>
              <select
                value={form.kategori}
                onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
              >
                <option value="">Tüm kategoriler</option>
                {kategoriler.map((k) => (
                  <option key={k.kategori} value={k.kategori}>
                    {k.kategori} ({k.sayi})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Yıl (başlangıç)</label>
                <input
                  type="number"
                  value={form.yilBaslangic}
                  onChange={(e) => setForm((f) => ({ ...f, yilBaslangic: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Yıl (bitiş)</label>
                <input
                  type="number"
                  value={form.yilBitis}
                  onChange={(e) => setForm((f) => ({ ...f, yilBitis: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Sayfa (min)</label>
                <input
                  type="number"
                  value={form.sayfaMin}
                  onChange={(e) => setForm((f) => ({ ...f, sayfaMin: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Sayfa (maks)</label>
                <input
                  type="number"
                  value={form.sayfaMaks}
                  onChange={(e) => setForm((f) => ({ ...f, sayfaMaks: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
            </div>

            <button type="button" onClick={temizle} className="text-[11px] text-kraft hover:text-muhur">
              Filtreleri Temizle
            </button>
          </div>
        )}
      </form>

      {aramaYapildi && !yukleniyor && sonuclar.length === 0 && <p className="mt-3 text-sm text-kraft">Sonuç bulunamadı.</p>}

      {sonuclar.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-kraft">{sonuclar.length} sonuç {sonuclar.length === 60 && '(ilk 60 gösteriliyor)'}</p>
          {sonuclar.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <div className="min-w-0">
                <button
                  onClick={() => incele(k)}
                  disabled={inceleniyorId === k.id}
                  className="truncate text-left text-sm font-medium text-murekkep hover:text-deniz hover:underline disabled:opacity-40"
                >
                  {inceleniyorId === k.id ? 'Açılıyor...' : k.baslik}
                </button>
                <p className="truncate text-xs text-kraft">
                  {[k.yazar, k.yayinevi, k.yil, k.sayfaSayisi && `${k.sayfaSayisi} s.`].filter(Boolean).join(' · ')}
                </p>
                {k.kategori && (
                  <Link
                    to={`/kitap-kategori/${encodeURIComponent(k.kategori)}`}
                    className="truncate text-[11px] text-deniz hover:underline"
                  >
                    {k.kategori}
                  </Link>
                )}
              </div>
              {k.url && (
                <a
                  href={k.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-sm bg-kagit px-2 py-1 text-[11px] text-kraft ring-1 ring-cizgi hover:underline"
                >
                  Kaynak →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
