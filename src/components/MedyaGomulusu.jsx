import InstagramGomulusu from './InstagramGomulusu.jsx'
import YoutubeGomulusu from './YoutubeGomulusu.jsx'
import TwitterGomulusu from './TwitterGomulusu.jsx'

// Sitenin "link yapıştır, gömülü göster" yapılan HER yerinde (Seyir Panosu,
// Etkinlik Habercisi, Kulüp etkinlikleri, eser sayfalarındaki ilgili
// paylaşımlar, Gezi Güncesi/Yazı gönderileri) InstagramGomulusu'nun yerini
// alan tek giriş noktası — linke bakıp Instagram/YouTube/X'ten hangisi
// olduğunu kendisi anlıyor, doğru bileşene yönlendiriyor. Böylece tüm bu
// yerlerde artık "instagramUrl" alanı üç platformdan herhangi birinin
// linkini kabul ediyor, ekstra bir alan/şema değişikliği gerekmeden.
export default function MedyaGomulusu({ url, paylasanAdi, kompakt = false }) {
  if (!url) return null
  if (/(youtube\.com|youtu\.be)/.test(url)) {
    return <YoutubeGomulusu url={url} paylasanAdi={paylasanAdi} kompakt={kompakt} />
  }
  if (/(twitter\.com|x\.com)/.test(url)) {
    return <TwitterGomulusu url={url} paylasanAdi={paylasanAdi} kompakt={kompakt} />
  }
  if (url.includes('instagram.com')) {
    return <InstagramGomulusu url={url} paylasanAdi={paylasanAdi} kompakt={kompakt} />
  }
  return null
}
