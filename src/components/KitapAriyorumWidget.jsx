import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { kitapIstekleriGetir, kitapIstegiOlustur } from '../utils/kitapIstek.js'
import EserSecici from './EserSecici.jsx'
import YatayKaydirma from './YatayKaydirma.jsx'

// /kitap-istekleri sayfasının anasayfa özeti — sitede zaten var olan
// "Günce Ekle" kalıbıyla aynı mantık: kapalı bir "+ Kitap Ara" butonu,
// tıklayınca sayfadan ayrılmadan küçük bir form açılıyor. Ödünç verme
// akışının (kim verdi, iade tarihi) TAMAMI bilerek burada yok — o kadar
// detay bir widget'ı kalabalıklaştırır, orası hâlâ /kitap-istekleri
// sayfasında. Şehir filtresi de bilerek yok — üyelerin çoğu zaten aynı
// yerde yaşıyor, anasayfa widget'ında gereksiz bir karmaşıklık olurdu.
export default function KitapAriyorumWidget() {
  const { kullanici, profil } = useAuth()
  const [istekler, setIstekler] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [not_, setNot_] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  function yenidenYukle() {
    kitapIstekleriGetir().then(setIstekler)
  }

  useEffect(() => {
    yenidenYukle()
  }, [])

  async function istekOlusturTiklandi(e) {
    e.preventDefault()
    if (!secili) return
    setGonderiliyor(true)
    try {
      await kitapIstegiOlustur(kullanici, profil, {
        disId: secili.disId,
        baslik: secili.baslik,
        alt: secili.altBaslik,
        posterUrl: secili.posterUrl,
        not: not_,
      })
      setSecili(null)
      setNot_('')
      setFormAcik(false)
      yenidenYukle()
    } finally {
      setGonderiliyor(false)
    }
  }

  const aktifIstekler = istekler?.filter((i) => i.durum === 'acik' || i.durum === 'oduncte') || []

  // Hâlâ yükleniyorsa ya da form açıksa iskeleti göstermeye devam et; veri
  // geldiğinde aktif istek yoksa (ve form kapalıysa) sadece davet niteliğinde
  // "+ Kitap Ara" butonuyla kalıyor — boş bir şerit göstermiyoruz.
  if (istekler !== null && aktifIstekler.length === 0 && !formAcik) {
    return (
      <div className="mb-10">
        <button
          onClick={() => setFormAcik(true)}
          className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
        >
          <span className="text-xl">📖</span>
          <div className="text-left">
            <p className="text-sm text-murekkep">Kitap Arıyorum</p>
            <p className="text-xs text-kraft">Elinde olmayan bir kitap mı arıyorsun? →</p>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📖 Kitap Arıyorum</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setFormAcik((a) => !a)} className="text-sm text-deniz hover:underline">
            {formAcik ? 'Vazgeç' : '+ Kitap Ara'}
          </button>
          {aktifIstekler.length > 0 && (
            <Link to="/kitap-istekleri" className="whitespace-nowrap text-sm text-kraft hover:text-deniz">
              Tümünü Gör ›
            </Link>
          )}
        </div>
      </div>

      {formAcik && (
        <form onSubmit={istekOlusturTiklandi} className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Hangi kitabı arıyorsun?</label>
            <EserSecici kategori="Kitap" secili={secili} onSecim={setSecili} onTemizle={() => setSecili(null)} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Not (opsiyonel)</label>
            <textarea
              value={not_}
              onChange={(e) => setNot_(e.target.value)}
              rows={2}
              placeholder="ör. Baskı/çeviri farketmez, sadece Türkçe olsun"
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <button
            type="submit"
            disabled={!secili || gonderiliyor}
            className="rounded-sm bg-gise px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {gonderiliyor ? 'Gönderiliyor...' : 'İsteği Oluştur'}
          </button>
        </form>
      )}

      {aktifIstekler.length > 0 && (
        <YatayKaydirma>
          {aktifIstekler.map((istek) => (
            <Link key={istek.id} to="/kitap-istekleri" className="shrink-0" style={{ width: 120 }}>
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {istek.posterUrl ? (
                  <img src={istek.posterUrl} alt={istek.baslik} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">📖</div>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{istek.baslik}</p>
              <p className="truncate text-[10px] text-kraft">{istek.isteyenAdi} arıyor</p>
            </Link>
          ))}
        </YatayKaydirma>
      )}
    </div>
  )
}
