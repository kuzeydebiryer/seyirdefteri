import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { kitapIstekleriGetir, kitapIstegiOlustur } from '../utils/kitapIstek.js'
import EserSecici from '../components/EserSecici.jsx'
import KitapIstekKarti from '../components/KitapIstekKarti.jsx'

export default function KitapIstekleri() {
  const { kullanici, profil } = useAuth()
  const [istekler, setIstekler] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [not_, setNot_] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [sadeceSehrim, setSadeceSehrim] = useState(false)

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

  // "oduncte" durumundaki istekler de gösterilmeye devam ediyor — aksi
  // halde ödünç verilen bir kitap sayfadan tamamen kaybolur, ne isteyen ne
  // ödünç veren "İade Edildi" butonunu bulamazdı. Sadece kesin kapanmış
  // (tamamlandi/kapandi) olanlar listeden çıkıyor.
  const aktifIstekler = istekler?.filter((i) => i.durum === 'acik' || i.durum === 'oduncte') || []
  const gosterilecekler =
    sadeceSehrim && profil?.sehir ? aktifIstekler.filter((i) => i.isteyenSehir === profil.sehir) : aktifIstekler

  return (
    <div>
      <Link to="/kitaplar" className="text-xs text-kraft hover:text-deniz">
        ← Kitap
      </Link>
      <div className="mt-1 mb-1 flex items-center justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">📖 Kitap Arıyorum</h1>
        {kullanici && (
          <button onClick={() => setFormAcik((a) => !a)} className="rounded-full bg-gise px-3 py-1.5 font-govde text-xs text-kagit">
            {formAcik ? 'Vazgeç' : '+ Kitap Ara'}
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-kraft">
        Okumak istediğin ama elinde olmayan bir kitabı burada arayabilirsin — kitaplığında o kitaba sahip olanlara otomatik haber
        gidiyor.
      </p>

      {formAcik && (
        <form onSubmit={istekOlusturTiklandi} className="mb-6 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
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
              placeholder="örn. 1 haftalığına lazım, yakında bir yolculuğa çıkıyorum"
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          {!profil?.sehir && (
            <p className="text-[11px] text-kraft">
              Şehrini profilinde belirtirsen, aynı şehirdekiler seni daha kolay bulabilir —{' '}
              <Link to={`/profil/${kullanici?.uid}`} className="text-deniz hover:underline">
                profilini düzenle
              </Link>
              .
            </p>
          )}
          <button
            type="submit"
            disabled={gonderiliyor || !secili}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {gonderiliyor ? 'Ekleniyor...' : 'İsteği Paylaş'}
          </button>
        </form>
      )}

      {profil?.sehir && (
        <label className="mb-4 flex items-center gap-2 text-xs text-kraft">
          <input type="checkbox" checked={sadeceSehrim} onChange={(e) => setSadeceSehrim(e.target.checked)} className="h-4 w-4 accent-muhur" />
          Sadece {profil.sehir}'dekiler
        </label>
      )}

      {istekler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {istekler !== null && gosterilecekler.length === 0 && <p className="text-sm text-kraft">Şu an açık bir istek yok.</p>}

      <div className="space-y-3">
        {gosterilecekler.map((istek) => (
          <KitapIstekKarti key={istek.id} istek={istek} onDegisti={yenidenYukle} />
        ))}
      </div>
    </div>
  )
}
