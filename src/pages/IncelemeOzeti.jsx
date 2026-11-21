import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { filmKunyesiGetir, incelemeBolumleriniGetir, sahneNotlariniGetir } from '../utils/incelemeDefteri.js'
import { kulupPuanlariniGetir } from '../utils/kulupPuanlari.js'
import { medyaGetir } from '../utils/incelemeMedya.js'
import OzetBelge from '../components/OzetBelge.jsx'

// Toplantı sonrası kulüp özeti: tek sayfada puanlar, herkesin sahne notları, sorular ve ortak defter.
// "Yazdır / PDF" butonu belgeyi (site arayüzü olmadan) A4'e basar; tarayıcıdan "PDF olarak kaydet" seçilir.
const YAZDIR_STIL = `
@media screen { .ozet-kok { display: none; } }
@media print {
  @page { size: A4; margin: 12mm; }
  html, body, #root { background: #fff !important; }
  body > *:not(.ozet-kok) { display: none !important; }
  .ozet-kok { display: block; }
  .ozet-kok, .ozet-kok * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`

export default function IncelemeOzeti() {
  const { etkinlikId } = useParams()
  const { kullanici } = useAuth()
  const [veri, setVeri] = useState(null)
  const [uyeMi, setUyeMi] = useState(null)
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!kullanici) return
    let iptal = false
    async function yukle() {
      const snap = await getDoc(doc(db, 'gelecekEtkinlikler', etkinlikId))
      if (!snap.exists()) {
        setHata('Etkinlik bulunamadı.')
        return
      }
      const etkinlik = { id: snap.id, ...snap.data() }
      const uye = await getDoc(doc(db, 'topluluklar', etkinlik.topluluklId, 'uyeler', kullanici.uid))
      if (iptal) return
      setUyeMi(uye.exists())
      if (!uye.exists()) {
        setVeri({ etkinlik })
        return
      }
      const [kunye, bolumler, sahneKayitlari, puanlar, medya] = await Promise.all([
        filmKunyesiGetir(etkinlik.eserTmdbId),
        incelemeBolumleriniGetir(etkinlikId),
        sahneNotlariniGetir(etkinlikId),
        kulupPuanlariniGetir(etkinlik).catch(() => []),
        medyaGetir(etkinlikId).catch(() => []),
      ])
      if (!iptal) setVeri({ etkinlik, kunye, bolumler, sahneKayitlari, puanlar, medya })
    }
    yukle().catch((err) => setHata(`Yüklenemedi: ${err.message}`))
    return () => {
      iptal = true
    }
  }, [etkinlikId, kullanici])

  if (hata) return <p className="text-sm text-muhur">{hata}</p>
  if (!veri) return <p className="text-sm text-kraft">Yükleniyor…</p>
  if (uyeMi === false) return <p className="text-sm text-kraft">Bu özet yalnızca {veri.etkinlik.topluluklAd} üyelerine açık.</p>

  const belge = <OzetBelge etkinlik={veri.etkinlik} kunye={veri.kunye} puanlar={veri.puanlar} sahneKayitlari={veri.sahneKayitlari} bolumler={veri.bolumler} medya={veri.medya} />

  return (
    <div>
      <style>{YAZDIR_STIL}</style>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link to={`/inceleme/${etkinlikId}`} className="text-xs text-kraft hover:text-deniz">
          ← İnceleme Defteri
        </Link>
        <button onClick={() => window.print()} className="ml-auto rounded-full bg-gise px-4 py-1.5 font-govde text-xs text-murekkep">
          🖨️ Yazdır / PDF Olarak Kaydet
        </button>
      </div>
      <p className="mb-3 text-xs text-kraft">Özet, defterdeki ve Yakın Okuma kartlarındaki mevcut yazılardan o anda derlenir. Kişisel notlar hiçbir zaman özete girmez.</p>

      <div className="overflow-hidden rounded-sm shadow ring-1 ring-cizgi">{belge}</div>

      {createPortal(<div className="ozet-kok">{belge}</div>, document.body)}
    </div>
  )
}
