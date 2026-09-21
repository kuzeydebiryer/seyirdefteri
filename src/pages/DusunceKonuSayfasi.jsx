import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { gununYazilariniGetir } from '../utils/dusunceHavuzu.js'
import { begeniDegistir } from '../utils/begeni.js'
import Avatar from '../components/Avatar.jsx'
import GonderiIcerik from '../components/GonderiIcerik.jsx'

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Tek bir kişinin bilinç akışı yazısı — konu sayfasında art arda sıralanan
// kartlardan biri. GonderiKarti'nin aksine BURADA içerik KISALTILMADAN
// (tam=true) gösteriliyor: bu sayfanın asıl amacı, farklı kişilerin aynı
// konuya verdiği cevapları tıklamadan yan yana/art arda karşılaştırabilmek.
function BilincAkisiKarti({ yazi }) {
  const { kullanici } = useAuth()
  const [begenenler, setBegenenler] = useState(yazi.begenenler || [])
  const benBegendimMi = kullanici && begenenler.includes(kullanici.uid)

  async function begenTiklandi() {
    if (!kullanici) return
    const yeni = benBegendimMi ? begenenler.filter((u) => u !== kullanici.uid) : [...begenenler, kullanici.uid]
    setBegenenler(yeni)
    await begeniDegistir(yazi.id, kullanici.uid, benBegendimMi)
  }

  return (
    <article className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="flex items-center gap-2 text-xs text-kraft">
        <Link to={`/profil/${yazi.yazarId}`} className="shrink-0">
          <Avatar adSoyad={yazi.yazarAdi} avatarUrl={yazi.yazarAvatarUrl} boyut="h-6 w-6" />
        </Link>
        <Link to={`/profil/${yazi.yazarId}`} className="font-medium text-murekkep hover:underline">
          {yazi.yazarAdi}
        </Link>
        <span>·</span>
        <span>{tarihGoster(yazi.tarih)}</span>
      </div>

      <div className="mt-2">
        <GonderiIcerik metin={yazi.gunce} tam={true} />
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-cizgi pt-2 text-xs text-kraft">
        <button
          onClick={begenTiklandi}
          disabled={!kullanici}
          className={`transition ${benBegendimMi ? 'text-muhur font-medium' : 'hover:text-murekkep'}`}
        >
          {benBegendimMi ? '♥' : '♡'} {begenenler.length > 0 && begenenler.length}
        </button>
        <Link to={`/gonderi/${yazi.id}`} className="hover:text-deniz">
          💬 {yazi.yorumSayisi || 0} yorum · kendi sayfasında aç →
        </Link>
      </div>
    </article>
  )
}

// Bugünün Düşüncesi'nin "konu sayfası" — bir konuya kimlerin ne yazdığını
// tek bir sayfada, art arda kartlar halinde toplar. Önceden her yazı kendi
// bağımsız gönderi sayfasındaydı (okuyucu iki kişinin cevabını karşılaştırmak
// için sekme/sayfa değiştirmek zorundaydı); artık aynı konudaki tüm yazılar
// burada bir arada. Yorum yapmak/beğenmek isteyen yine "kendi sayfasında
// aç" ile o yazının tek başına gönderi sayfasına gidebiliyor.
export default function DusunceKonuSayfasi() {
  const { konu } = useParams()
  const konuMetni = decodeURIComponent(konu || '')
  const { kullanici } = useAuth()
  const [yazilar, setYazilar] = useState(null)

  useEffect(() => {
    gununYazilariniGetir(konuMetni).then(setYazilar)
  }, [konuMetni])

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="text-xs text-kraft hover:text-deniz">
        ← Anasayfa
      </Link>
      <p className="mt-2 text-xs uppercase tracking-widest text-gise">💭 Bugünün Düşüncesi</p>
      <h1 className="mt-1 font-baslik text-2xl leading-snug text-murekkep">{konuMetni}</h1>
      <p className="mb-6 mt-1 text-sm text-kraft">
        {yazilar === null ? 'Yükleniyor...' : yazilar.length > 0 ? `${yazilar.length} kişi bu konu üzerine yazdı.` : ''}
      </p>

      {kullanici && (
        <Link
          to={`/gonderi-ekle?tur=yazi&altTur=bilinc-akisi&konu=${encodeURIComponent(konuMetni)}`}
          className="mb-6 inline-block rounded-full bg-gise px-4 py-2 font-govde text-xs text-kagit"
        >
          ✍️ Sen de Yaz
        </Link>
      )}

      {yazilar?.length === 0 && <p className="text-sm text-kraft">Bu konu üzerine henüz kimse yazmamış — ilk sen ol.</p>}

      <div className="space-y-4">
        {yazilar?.map((y) => (
          <BilincAkisiKarti key={y.id} yazi={y} />
        ))}
      </div>
    </div>
  )
}
