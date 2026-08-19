import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { gunlukBegenDegistir, gunlukKaydiLinki, gunlukKaydiEylemMetni, gunlukKaydiYerTutucuIkon } from '../utils/gunluk.js'
import { yorumBegenDegistir } from '../utils/yorum.js'
import YildizPuan from './YildizPuan.jsx'
import Avatar from './Avatar.jsx'

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// "X, Y'yi izledi/okudu ★★★½ — [not varsa]" — Letterboxd'daki Friends akışının
// hafif (yazı yazmadan sadece puanlama/işaretleme) versiyonu. GonderiKarti'yla
// aynı görsel dile sadık kalıyor ama daha az yer kaplıyor, çünkü bu bilinçli
// olarak "günce yazmadım, sadece kaydettim" seviyesindeki bir aktivite.
export default function TakipGunlukKarti({ kayit }) {
  const { kullanici } = useAuth()
  const navigate = useNavigate()
  const [begenenler, setBegenenler] = useState(kayit.begenenler || [])
  const benBegendimMi = kullanici && begenenler.includes(kullanici.uid)

  async function begenTiklandi(e) {
    e.stopPropagation()
    if (!kullanici) return
    const yeni = benBegendimMi ? begenenler.filter((u) => u !== kullanici.uid) : [...begenenler, kullanici.uid]
    setBegenenler(yeni)
    // Kart bir yorum aktivitesiyse "yorumlar" koleksiyonuna, gerçek bir
    // günlük (puanlama) kaydıysa "gunlukKayitlari"na yazılıyor — kayit.id
    // ikisinde de farklı bir koleksiyona ait olduğundan bu ayrım şart.
    if (kayit._aktiviteTuru === 'yorum' || kayit._aktiviteTuru === 'yanit') {
      await yorumBegenDegistir(kayit.id, kullanici.uid, benBegendimMi)
    } else {
      await gunlukBegenDegistir(kayit.id, kullanici.uid, benBegendimMi)
    }
  }

  return (
    <article
      onClick={() => navigate(gunlukKaydiLinki(kayit))}
      className="gonderi-karti relative flex cursor-pointer gap-4 overflow-hidden p-4 pl-5 transition hover:ring-1 hover:ring-cizgi"
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-cizgi" />

      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
        {kayit.posterUrl ? (
          <img src={kayit.posterUrl} alt={kayit.baslik} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">{gunlukKaydiYerTutucuIkon(kayit)}</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-kraft">
          <Link to={`/profil/${kayit.kullaniciId}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Avatar adSoyad={kayit.kullaniciAdi} avatarUrl={kayit.kullaniciAvatarUrl} boyut="h-5 w-5" />
          </Link>
          <Link to={`/profil/${kayit.kullaniciId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-murekkep hover:underline">
            {kayit.kullaniciAdi}
          </Link>
          <span>{gunlukKaydiEylemMetni(kayit)}</span>
          <span>·</span>
          <span>{tarihGoster(kayit.izlemeTarihi)}</span>
        </div>

        <h3 className="font-baslik text-lg text-murekkep mt-1">
          {kayit.baslik} {kayit.yil && <span className="text-kraft text-sm">({kayit.yil})</span>}
        </h3>

        {kayit.puan != null && <YildizPuan puan={kayit.puan} boyut="text-sm" onluGoster={false} />}

        {kayit.not && <p className="mt-1 text-sm text-murekkep leading-relaxed line-clamp-3">{kayit.not}</p>}

        <div className="mt-2 flex items-center gap-4 text-xs text-kraft">
          <button
            onClick={begenTiklandi}
            disabled={!kullanici}
            className={`transition ${benBegendimMi ? 'text-muhur font-medium' : 'hover:text-murekkep'}`}
          >
            {benBegendimMi ? '♥' : '♡'} {begenenler.length > 0 && begenenler.length}
          </button>
        </div>
      </div>
    </article>
  )
}
