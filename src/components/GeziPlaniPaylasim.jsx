import { useState } from 'react'
import { Link } from 'react-router-dom'
import { kullaniciAraKullaniciAdiIle, planaOrtakDuzenleyenEkle, plandanOrtakDuzenleyenCikar } from '../utils/geziPlanlari.js'
import Avatar from './Avatar.jsx'

// Gezi planı detay sayfasında — sadece sahip görür. Kullanıcı adına göre
// arayıp plana ekliyor (eklenen kişiye Cloud Function otomatik bildirim
// gönderiyor — bkz. functions/index.js geziPlaniPaylasimBildirimi), mevcut
// ortak düzenleyenleri listeleyip çıkarabiliyor.
export default function GeziPlaniPaylasim({ planId, sahipId, ortakDuzenleyenler, ortakDuzenleyenlerBilgi, onDegisti }) {
  const [acik, setAcik] = useState(false)
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [aranıyor, setAraniyor] = useState(false)
  const [ekleniyorId, setEkleniyorId] = useState(null)

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    setAraniyor(true)
    try {
      const bulunanlar = await kullaniciAraKullaniciAdiIle(arama)
      setSonuclar(bulunanlar.filter((k) => k.id !== sahipId && !ortakDuzenleyenler.includes(k.id)))
    } finally {
      setAraniyor(false)
    }
  }

  async function ekle(kullaniciData) {
    setEkleniyorId(kullaniciData.id)
    try {
      await planaOrtakDuzenleyenEkle(planId, kullaniciData)
      setSonuclar((liste) => liste.filter((k) => k.id !== kullaniciData.id))
      setArama('')
      onDegisti()
    } finally {
      setEkleniyorId(null)
    }
  }

  async function cikar(uid) {
    if (!window.confirm('Bu kişiyi plandan çıkarmak istediğine emin misin?')) return
    await plandanOrtakDuzenleyenCikar(planId, uid)
    onDegisti()
  }

  return (
    <div className="mb-6 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
      <button onClick={() => setAcik((a) => !a)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-medium text-murekkep">
          👥 Paylaşılanlar {ortakDuzenleyenler.length > 0 && `(${ortakDuzenleyenler.length})`}
        </span>
        <span className="text-xs text-kraft">{acik ? '▲' : '▼'}</span>
      </button>

      {acik && (
        <div className="mt-3 space-y-3">
          {ortakDuzenleyenler.length > 0 && (
            <div className="space-y-1.5">
              {ortakDuzenleyenler.map((uid) => {
                const bilgi = ortakDuzenleyenlerBilgi?.[uid]
                return (
                  <div key={uid} className="flex items-center justify-between gap-2">
                    <Link to={`/profil/${uid}`} className="flex items-center gap-2">
                      <Avatar adSoyad={bilgi?.adSoyad} avatarUrl={bilgi?.avatarUrl} boyut="h-6 w-6" />
                      <span className="text-xs text-murekkep">{bilgi?.adSoyad || 'İsimsiz'}</span>
                    </Link>
                    <button onClick={() => cikar(uid)} className="text-[11px] text-kraft hover:text-muhur">
                      Çıkar
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <form onSubmit={ara} className="flex gap-2">
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Kullanıcı adına göre ara..."
              className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <button type="submit" disabled={aranıyor} className="rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
              {aranıyor ? 'Aranıyor...' : 'Ara'}
            </button>
          </form>

          {sonuclar.length > 0 && (
            <div className="space-y-1.5">
              {sonuclar.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-2 rounded-sm bg-kagitKoyu px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar adSoyad={k.adSoyad} avatarUrl={k.avatarUrl} boyut="h-6 w-6" />
                    <span className="text-xs text-murekkep">{k.adSoyad} <span className="text-kraft">@{k.kullaniciAdi}</span></span>
                  </div>
                  <button
                    onClick={() => ekle(k)}
                    disabled={ekleniyorId === k.id}
                    className="rounded-sm bg-muhur px-2 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
                  >
                    {ekleniyorId === k.id ? 'Ekleniyor...' : '+ Ekle'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
