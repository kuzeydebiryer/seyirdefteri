import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  kitabinSahipleriniBul,
  kitapIstegiKapat,
  kitapIstegiSil,
  kitapOduncVer,
  kitapIadeEdildi,
} from '../utils/kitapIstek.js'
import { eserYorumlariGetir, eserYorumEkle } from '../utils/yorum.js'
import Avatar from './Avatar.jsx'

const DURUM_ETIKETI = { acik: 'Açık', oduncte: '📤 Ödünçte', tamamlandi: '✓ Tamamlandı', kapandi: 'Kapandı' }

// Yorum ipliği, yorum.js'in {tur, disId} genel sözleşmesini "kitap-istek" +
// isteğin kendi doküman ID'si ile kullanıyor — gerçek kitap sayfasının
// yorumlarına hiç karışmıyor, ayrı bir mekanizma kurmaya gerek kalmadı.
export default function KitapIstekKarti({ istek, onDegisti }) {
  const { kullanici, profil } = useAuth()
  const [sahipUidleri, setSahipUidleri] = useState(null)
  const [yorumlar, setYorumlar] = useState(null)
  const [yeniYorum, setYeniYorum] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [yorumlarAcik, setYorumlarAcik] = useState(false)
  const [oduncFormAcik, setOduncFormAcik] = useState(false)
  const [iadeTarihiTaslak, setIadeTarihiTaslak] = useState('')

  const benimIstegimMi = kullanici?.uid === istek.isteyenId
  const benSahiplerdenBiriMiyim = sahipUidleri?.includes(kullanici?.uid)

  useEffect(() => {
    kitabinSahipleriniBul(istek.disId).then(setSahipUidleri)
  }, [istek.disId])

  useEffect(() => {
    if (!yorumlarAcik) return
    eserYorumlariGetir('kitap-istek', istek.id).then(setYorumlar)
  }, [yorumlarAcik, istek.id])

  async function yorumGonder(e) {
    e.preventDefault()
    if (!yeniYorum.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      await eserYorumEkle('kitap-istek', istek.id, kullanici, gorunenAdGetir(profil, kullanici.displayName), yeniYorum, {
        eserBaslik: istek.baslik,
        eserPosterUrl: istek.posterUrl,
      })
      setYeniYorum('')
      eserYorumlariGetir('kitap-istek', istek.id).then(setYorumlar)
    } finally {
      setGonderiliyor(false)
    }
  }

  async function kapatTiklandi() {
    await kitapIstegiKapat(istek.id)
    onDegisti?.()
  }

  async function silTiklandi() {
    if (!window.confirm('Bu isteği tamamen silmek istediğine emin misin?')) return
    await kitapIstegiSil(istek.id)
    onDegisti?.()
  }

  async function oduncVerTiklandi(e) {
    e.preventDefault()
    if (!iadeTarihiTaslak) return
    await kitapOduncVer(istek.id, kullanici, profil, iadeTarihiTaslak)
    setOduncFormAcik(false)
    onDegisti?.()
  }

  async function iadeEdildiTiklandi() {
    await kitapIadeEdildi(istek.id)
    onDegisti?.()
  }

  return (
    <div className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="flex items-start gap-3">
        <Link to={`/kitap/${istek.disId}`} className="shrink-0">
          {istek.posterUrl ? (
            <img src={istek.posterUrl} alt={istek.baslik} className="h-24 w-16 rounded-sm object-cover ring-1 ring-cizgi" />
          ) : (
            <div className="flex h-24 w-16 items-center justify-center rounded-sm bg-kagit text-xl ring-1 ring-cizgi">📖</div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={`/kitap/${istek.disId}`} className="font-baslik text-base text-murekkep hover:underline">
              {istek.baslik}
            </Link>
            {istek.durum !== 'acik' && (
              <span className="rounded-full bg-kagit px-2 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi">{DURUM_ETIKETI[istek.durum]}</span>
            )}
          </div>
          {istek.alt && <p className="text-xs text-kraft">{istek.alt}</p>}
          <div className="mt-1 flex items-center gap-1.5">
            <Avatar adSoyad={istek.isteyenAdi} boyut="h-5 w-5" />
            <span className="text-xs text-kraft">
              {istek.isteyenAdi} arıyor{istek.isteyenSehir && ` · 📍 ${istek.isteyenSehir}`}
            </span>
          </div>
          {istek.not && <p className="mt-1 text-sm text-murekkep">{istek.not}</p>}
          {istek.durum === 'acik' && sahipUidleri !== null && (
            <p className="mt-1 text-xs text-deniz">
              {sahipUidleri.length > 0 ? `📚 Kitaplığında ${sahipUidleri.length} kişide var` : 'Şu an kitaplığında işaretleyen yok'}
            </p>
          )}
          {istek.durum === 'oduncte' && (
            <p className="mt-1 text-xs text-deniz">
              {istek.oduncVerenAdi} ödünç verdi — iade: {new Date(istek.iadeTarihi).toLocaleDateString('tr-TR')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-[11px]">
          {benimIstegimMi && istek.durum === 'acik' && (
            <button onClick={kapatTiklandi} className="text-deniz hover:underline">
              Buldum, kapat
            </button>
          )}
          {(benimIstegimMi || istek.oduncVerenId === kullanici?.uid) && istek.durum === 'oduncte' && (
            <button onClick={iadeEdildiTiklandi} className="text-deniz hover:underline">
              İade Edildi
            </button>
          )}
          {benimIstegimMi && (
            <button onClick={silTiklandi} className="text-kraft hover:text-muhur">
              Sil
            </button>
          )}
        </div>
      </div>

      {istek.durum === 'acik' && benSahiplerdenBiriMiyim && !benimIstegimMi && (
        <div className="mt-3 border-t border-cizgi pt-3">
          {oduncFormAcik ? (
            <form onSubmit={oduncVerTiklandi} className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-kraft">İade tarihi:</label>
              <input
                type="date"
                value={iadeTarihiTaslak}
                onChange={(e) => setIadeTarihiTaslak(e.target.value)}
                required
                className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <button type="submit" className="rounded-sm bg-muhur px-3 py-1 text-xs font-govde text-kagit">
                Onayla
              </button>
              <button type="button" onClick={() => setOduncFormAcik(false)} className="text-xs text-kraft">
                Vazgeç
              </button>
            </form>
          ) : (
            <button
              onClick={() => setOduncFormAcik(true)}
              className="rounded-sm bg-kagit px-3 py-1.5 text-xs font-govde text-murekkep ring-1 ring-cizgi hover:ring-deniz/50"
            >
              📚 Bende var, ödünç veriyorum
            </button>
          )}
        </div>
      )}

      <button onClick={() => setYorumlarAcik((a) => !a)} className="mt-3 text-xs text-deniz hover:underline">
        {yorumlarAcik ? 'Yorumları gizle' : 'Yorumlar / İletişime geç'}
      </button>

      {yorumlarAcik && (
        <div className="mt-2 space-y-2 border-t border-cizgi pt-2">
          {yorumlar === null && <p className="text-xs text-kraft">Yükleniyor...</p>}
          {yorumlar?.map((y) => (
            <div key={y.id} className="flex items-start gap-1.5">
              <Avatar adSoyad={y.yazarAdi} boyut="h-5 w-5" />
              <p className="text-xs text-murekkep">
                <span className="font-medium">{y.yazarAdi}</span>: {y.metin}
              </p>
            </div>
          ))}
          {yorumlar?.length === 0 && <p className="text-xs text-kraft">Henüz yorum yok.</p>}
          {kullanici && (
            <form onSubmit={yorumGonder} className="flex gap-2">
              <input
                type="text"
                value={yeniYorum}
                onChange={(e) => setYeniYorum(e.target.value)}
                placeholder="Bende var, ulaşabilirsin..."
                className="flex-1 rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <button type="submit" disabled={gonderiliyor} className="rounded-sm bg-deniz px-3 py-1.5 text-xs text-kagit disabled:opacity-40">
                Gönder
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
