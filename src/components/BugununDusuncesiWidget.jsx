import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  gununKonusuGetir,
  gununYazilariniGetir,
  konuOner,
  havuzuDoldur,
  havuzuGenislet,
  dalgaVarMi,
  havuzBuyuklugu,
  BASLANGIC_KONULARI,
  IKINCI_DALGA_KONULARI,
} from '../utils/dusunceHavuzu.js'
import Avatar from './Avatar.jsx'

// "Bilinç Akışı" yazı alt türünün günlük tetikleyicisi — Serbest Düşünce
// Havuzu'ndan tarihe göre deterministik olarak seçilen bir konu, herkese
// aynı dönemde aynı şekilde gösteriliyor. "Yaz" bağlantısı, GonderiEkle
// sayfasını kategori/altTür/başlık önceden doldurulmuş şekilde açıyor.
export default function BugununDusuncesiWidget() {
  const { kullanici, profil } = useAuth()
  const [konu, setKonu] = useState(undefined) // undefined = yükleniyor, null = havuz boş
  const [yazilar, setYazilar] = useState([])
  const [listeAcik, setListeAcik] = useState(false)
  const [oneriAcik, setOneriAcik] = useState(false)
  const [oneriMetni, setOneriMetni] = useState('')
  const [oneriGonderiliyor, setOneriGonderiliyor] = useState(false)
  const [havuzDolduruluyor, setHavuzDolduruluyor] = useState(false)
  const [dalga2Yukleniyor, setDalga2Yukleniyor] = useState(false)
  const [dalga2Eklendi, setDalga2Eklendi] = useState(undefined) // undefined = henüz kontrol edilmedi
  const [konuSayisi, setKonuSayisi] = useState(null)
  const [aciklamaAcik, setAciklamaAcik] = useState(false)

  useEffect(() => {
    gununKonusuGetir().then(setKonu)
    dalgaVarMi('dalga2').then(setDalga2Eklendi)
    havuzBuyuklugu().then(setKonuSayisi)
  }, [])

  useEffect(() => {
    if (!konu) return
    gununYazilariniGetir(konu.konu).then(setYazilar)
  }, [konu])

  async function oneriGonder(e) {
    e.preventDefault()
    if (!oneriMetni.trim() || !kullanici) return
    setOneriGonderiliyor(true)
    try {
      await konuOner(oneriMetni, kullanici)
      setOneriMetni('')
      setOneriAcik(false)
      setKonuSayisi((n) => (n == null ? n : n + 1))
      window.alert('Teşekkürler, konun havuza eklendi — bir gün sırası gelecek.')
    } finally {
      setOneriGonderiliyor(false)
    }
  }

  async function havuzuDolduTiklandi() {
    setHavuzDolduruluyor(true)
    try {
      const sonuc = await havuzuDoldur()
      if (sonuc.zatenVarMi) {
        window.alert('Havuz zaten dolu görünüyor — sayfayı yenile.')
      } else {
        window.alert(`${sonuc.yazildi} konu havuza eklendi.`)
        gununKonusuGetir().then(setKonu)
        havuzBuyuklugu().then(setKonuSayisi)
      }
    } finally {
      setHavuzDolduruluyor(false)
    }
  }

  async function dalga2EkleTiklandi() {
    setDalga2Yukleniyor(true)
    try {
      const sonuc = await havuzuGenislet(IKINCI_DALGA_KONULARI, 'dalga2')
      setDalga2Eklendi(true)
      if (sonuc.zatenVarMi) {
        window.alert('İkinci dalga zaten eklenmiş görünüyor.')
      } else {
        window.alert(`${sonuc.yazildi} yeni konu (kültür/sanat/sinema/psikoloji/kitap/tiyatro/felsefe) havuza eklendi.`)
        havuzBuyuklugu().then(setKonuSayisi)
      }
    } finally {
      setDalga2Yukleniyor(false)
    }
  }

  if (konu === undefined) return null

  return (
    <div className="mb-10 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-gise">💭 Bugünün Düşüncesi</p>
        <button onClick={() => setAciklamaAcik((a) => !a)} className="text-[11px] text-kraft hover:text-deniz" title="Bilinç Akışı nedir?">
          ⓘ Bu ne?
        </button>
      </div>

      {aciklamaAcik && (
        <div className="mb-3 space-y-2 rounded-sm bg-kagit p-3 text-xs text-kraft ring-1 ring-cizgi">
          <p>
            <strong className="text-murekkep">Bilinç Akışı</strong>, bir roman ve öykü anlatım tekniğidir. Karakterin zihninden geçen
            düşünce, duygu ve anıları hiçbir mantıksal sıra, filtre veya dil kuralı süzgecinden geçirmeden, doğallığıyla ve anlık
            atlamalarla doğrudan okuyucuya aktaran bir yöntemdir.
          </p>
          <p className="font-medium text-murekkep">Temel Özellikleri</p>
          <ul className="list-disc space-y-1 pl-4">
            <li><strong className="text-murekkep">Filtresiz Aktarım:</strong> Karakterin kafasındakiler sansürsüz ve ham haliyle verilir.</li>
            <li><strong className="text-murekkep">Mantıksal Düzen Yok:</strong> Düşünceler bir mantık sırasına uymaz; bir çağrışımla birden geçmişe ya da başka bir konuya atlar.</li>
            <li><strong className="text-murekkep">Noktalama Eksikliği:</strong> Cümleler düzensizdir. Noktalama işaretleri ya az kullanılır ya da tamamen yok sayılır.</li>
            <li><strong className="text-murekkep">Aracısız Anlatım:</strong> Yazar aradan çekilir; okur, karakterin zihnini doğrudan izler.</li>
          </ul>
          <p>
            Burada bu tekniği <strong className="text-murekkep">serbest düşünce havuzuyla</strong> birleştiriyoruz: her birkaç günde bir
            havuzdan ortak bir soru/konu düşüyor, sen de o konu üzerine aklından geçenleri — mantık sırası, "doğru cümle kurma" kaygısı
            olmadan — serbestçe yazıyorsun. Herkes aynı konuya farklı bir zihinden bakıyor; ortaya bir tartışma değil, bir "zihin
            kesitleri" koleksiyonu çıkıyor.
          </p>
        </div>
      )}

      {konu === null ? (
        kullanici && (
          <div>
            <p className="text-sm text-kraft">
              Serbest Düşünce Havuzu henüz boş — Bilinç Akışı'nın günlük tetikleyicisi için {BASLANGIC_KONULARI.length} konuluk
              başlangıç havuzunu bir kerelik yükleyebilirsin.
            </p>
            <button
              onClick={havuzuDolduTiklandi}
              disabled={havuzDolduruluyor}
              className="mt-2 rounded-full bg-gise px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {havuzDolduruluyor ? 'Yükleniyor...' : `Havuzu Doldur (${BASLANGIC_KONULARI.length} konu)`}
            </button>
          </div>
        )
      ) : (
        <>
          <h2 className="font-baslik text-xl text-murekkep leading-snug">{konu.konu}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {kullanici && (
              <Link
                to={`/gonderi-ekle?tur=yazi&altTur=bilinc-akisi&konu=${encodeURIComponent(konu.konu)}`}
                className="rounded-full bg-gise px-3 py-1.5 font-govde text-xs text-kagit"
              >
                ✍️ Yaz
              </Link>
            )}
            <button onClick={() => setListeAcik((a) => !a)} className="text-xs text-kraft hover:text-deniz">
              {yazilar.length > 0 ? `${yazilar.length} kişi yazdı ${listeAcik ? '▲' : '▼'}` : 'Henüz kimse yazmadı'}
            </button>
            {kullanici && (
              <button onClick={() => setOneriAcik((a) => !a)} className="text-xs text-kraft hover:text-deniz">
                {oneriAcik ? 'Vazgeç' : '+ Konu Öner'}
              </button>
            )}
            <Link to="/dusunce-arsivi" className="text-xs text-kraft hover:text-deniz">
              📜 Geçmiş Konular
            </Link>
            {profil?.yonetici && (
              <Link to="/dusunce-havuzu-yonetim" className="text-xs text-kraft hover:text-deniz">
                🛠 Havuzu Yönet
              </Link>
            )}
          </div>

          {konuSayisi != null && <p className="mt-2 text-[11px] text-kraft">Havuzda toplam {konuSayisi} konu var.</p>}

          {listeAcik && yazilar.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-cizgi pt-3">
              {yazilar.map((y) => (
                <li key={y.id}>
                  <Link to={`/gonderi/${y.id}`} className="flex items-center gap-2 text-xs hover:text-deniz">
                    <Avatar adSoyad={y.yazarAdi} avatarUrl={y.yazarAvatarUrl} boyut="h-5 w-5" />
                    <span className="text-murekkep">{y.yazarAdi}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {oneriAcik && (
            <form onSubmit={oneriGonder} className="mt-3 space-y-2 border-t border-cizgi pt-3">
              <textarea
                value={oneriMetni}
                onChange={(e) => setOneriMetni(e.target.value)}
                placeholder="Bir gün havuzdan çıkmasını istediğin bir düşünce sorusu yaz..."
                rows={2}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <button
                type="submit"
                disabled={oneriGonderiliyor || !oneriMetni.trim()}
                className="rounded-sm bg-muhur px-3 py-1 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {oneriGonderiliyor ? 'Gönderiliyor...' : 'Havuza Ekle'}
              </button>
            </form>
          )}

          {kullanici && dalga2Eklendi === false && (
            <button
              onClick={dalga2EkleTiklandi}
              disabled={dalga2Yukleniyor}
              className="mt-3 block text-[11px] text-kraft hover:text-deniz disabled:opacity-40"
            >
              {dalga2Yukleniyor
                ? 'Ekleniyor...'
                : `+ Kültür/Sanat/Sinema/Psikoloji/Kitap/Tiyatro/Felsefe dalgasını ekle (${IKINCI_DALGA_KONULARI.length} konu)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
