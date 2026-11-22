import { useEffect, useMemo, useState } from 'react'
import {
  ALTYAZI_MAKS_BAYT,
  altyaziIcerigiGetir,
  altyaziSil,
  altyaziYukle,
  altyazilariDinle,
  anNotuEkle,
  anNotuGuncelle,
  anNotuSil,
  dosyaMetniOku,
  replikAra,
  srtCoz,
  zamanCoz,
  zamanFormatla,
} from '../utils/altyazi.js'

// "💬 Altyazı: Repliği Bul" — filmdeki bir ana dönmek için aranabilir dizin (oynatıcı değil).
// Akış: .srt yükle → hatırladığın kelimeyi ara → sonucun bağlamını gör → "Bu ana not ekle"
// → istersen "Tartışmaya ekle" (Zoom Tartışma Modu slaytı). Diyalogsuz sahneler için zaman
// kodunu elle girerek de not eklenebilir. Notlar üye başınadır; kimse kimsenin notunu değiştiremez.

const etiketle = (a) => [a.dil, a.surum].filter(Boolean).join(' · ') || a.dosyaAdi || 'Altyazı'

function bosForm(ayar = {}) {
  return {
    id: null,
    altyaziId: '',
    altyaziEtiketi: '',
    satirNo: null,
    orijinalMs: null,
    hedef: '',
    replik: '',
    yorum: '',
    soru: '',
    gorunurluk: 'ozel',
    slaytta: false,
    yorumAcik: false,
    medyaId: '',
    ...ayar,
  }
}

function AnNotuFormu({ form, setForm, medya, kaydet, vazgec, mesgul, hata }) {
  const kilitliKulup = form.slaytta
  const hedefMs = zamanCoz(form.hedef)
  const degistiMi = form.orijinalMs != null && hedefMs != null && hedefMs !== form.orijinalMs
  const guncelle = (kisim) => setForm((f) => ({ ...f, ...kisim }))

  return (
    <div className="mb-3 rounded-sm bg-kagitKoyu p-3 ring-2 ring-gise">
      <p className="mb-2 font-baslik text-sm text-murekkep">{form.id ? '✏️ Notu düzenle' : '📌 Bu ana not ekle'}</p>

      <div className="grid gap-3 md:grid-cols-[9rem_1fr]">
        <div>
          <label className="text-xs font-bold text-murekkep">Zaman kodu</label>
          <input
            value={form.hedef}
            onChange={(e) => guncelle({ hedef: e.target.value })}
            placeholder="00:42:18"
            className="mt-1 w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
          />
          {form.orijinalMs != null && (
            <p className="mt-1 text-[10px] text-kraft">
              Altyazı zamanı: {zamanFormatla(form.orijinalMs)}
              {degistiMi && ' · hedef zaman elle düzeltildi (özgün kod korunur)'}
            </p>
          )}
          {form.orijinalMs == null && <p className="mt-1 text-[10px] text-kraft">Saat:dakika:saniye (ör. 1:02:03 ya da 42:18)</p>}
        </div>
        <div>
          <label className="text-xs font-bold text-murekkep">Replik {form.altyaziId ? '(altyazıdan alıntı)' : '(isteğe bağlı — diyalogsuz sahnede boş bırak)'}</label>
          {form.altyaziId ? (
            <p className="mt-1 whitespace-pre-wrap rounded-sm bg-kagit px-2 py-1.5 text-sm italic text-murekkep ring-1 ring-cizgi">“{form.replik}”</p>
          ) : (
            <input
              value={form.replik}
              onChange={(e) => guncelle({ replik: e.target.value })}
              maxLength={700}
              className="mt-1 w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
            />
          )}
          {form.altyaziEtiketi && <p className="mt-1 text-[10px] text-kraft">Kaynak: {form.altyaziEtiketi}</p>}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs font-bold text-murekkep">Gözlemim / yorumum</label>
        <p className="text-[11px] italic text-kraft">Replik notun dayanağıdır, yorum senindir. Bu not diğer üyelerin notunun yerine geçmez.</p>
        <textarea
          value={form.yorum}
          onChange={(e) => guncelle({ yorum: e.target.value })}
          rows={3}
          maxLength={2000}
          className="mt-1 w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
        />
      </div>

      <div className="mt-2">
        <label className="text-xs font-bold text-murekkep">Zoom'da soracağım soru (isteğe bağlı)</label>
        <input
          value={form.soru}
          onChange={(e) => guncelle({ soru: e.target.value })}
          maxLength={500}
          placeholder="Bu cümleyi bir karar gibi mi, bir yardım çağrısı gibi mi duydunuz?"
          className="mt-1 w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
        />
      </div>

      {medya.length > 0 && (
        <div className="mt-2">
          <label className="text-xs font-bold text-murekkep">Kare / kesit ilişkilendir (isteğe bağlı)</label>
          <select value={form.medyaId} onChange={(e) => guncelle({ medyaId: e.target.value })} className="mt-1 w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi">
            <option value="">— yok —</option>
            {medya.map((m) => (
              <option key={m.id} value={m.id}>
                {m.tur === 'kare' ? '🖼️' : '🎬'} {m.baslik || (m.tur === 'kare' ? 'Adsız kare' : 'Adsız kesit')}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3 space-y-1 text-xs text-murekkep">
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={form.gorunurluk === 'kulup' || kilitliKulup} disabled={kilitliKulup} onChange={(e) => guncelle({ gorunurluk: e.target.checked ? 'kulup' : 'ozel' })} className="mt-0.5" />
          <span>Kulüple paylaş <span className="text-kraft">(işaretlemezsen bu not sadece sana görünür)</span></span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={form.slaytta} onChange={(e) => guncelle({ slaytta: e.target.checked, yorumAcik: e.target.checked ? form.yorumAcik : false, gorunurluk: e.target.checked ? 'kulup' : form.gorunurluk })} className="mt-0.5" />
          <span>🎤 Tartışmaya ekle <span className="text-kraft">(Zoom Tartışma Modu'nda slayt olarak çıkar)</span></span>
        </label>
        {form.slaytta && (
          <label className="ml-6 flex items-start gap-2">
            <input type="checkbox" checked={form.yorumAcik} onChange={(e) => guncelle({ yorumAcik: e.target.checked })} className="mt-0.5" />
            <span>Yorumum da slayta eklensin <span className="text-kraft">(sadece tıklayınca açılır; grup ilk izlenimleri paylaştıktan sonra)</span></span>
          </label>
        )}
      </div>

      {/* Paylaşım önizlemesi: slayta tam olarak ne taşınacak */}
      {form.slaytta && (
        <div className="mt-3 rounded-sm bg-murekkep p-3 text-kagit">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-kagit">Slayta taşınacaklar (önizleme)</p>
          <p className="text-sm">⏱ {hedefMs != null ? zamanFormatla(hedefMs) : '— zaman kodu eksik —'}</p>
          {form.replik && <p className="text-sm italic">“{form.replik}”</p>}
          <p className="text-sm">{form.soru ? `💬 ${form.soru}` : <span className="text-kagit/80">Soru yazmadın: slaytta sadece zaman kodu ve replik görünür.</span>}</p>
          <p className="text-xs text-kagit/90">
            {form.yorumAcik ? 'Yorumun: slaytta gizli, tıklayınca sorudan sonra açılır.' : 'Yorumun slayta GİRMEZ.'}
            {' '}Notun diğer üyelere de görünür olacak.
          </p>
        </div>
      )}

      {hata && <p className="mt-2 text-xs text-muhur">{hata}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={kaydet} disabled={mesgul} className="rounded-full bg-gise px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
          {mesgul ? 'Kaydediliyor…' : form.id ? 'Güncelle' : 'Kaydet'}
        </button>
        <button onClick={vazgec} className="rounded-full bg-kagit px-4 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi">Vazgeç</button>
      </div>
    </div>
  )
}

// "İçeriği Göster" penceresi: bulunan satırın öncesi ve sonrası 10'ar satır (genişletilebilir).
// Bir replik birkaç satıra bölünmüş olabilir; satırlara tıklayarak aralık seçilir (ilk tık başlangıç,
// ikinci tık bitiş), sonra seçili satırlarla not ya da Tartışma slaytı oluşturulur.
// Renkler sabit (siyah zemin / beyaz yazı): site teması koyu da olsa açık da olsa aynı okunur.
function AltyaziPenceresi({ icerik, p, setP, etiket, kapat, notEkle }) {
  const bas = Math.max(0, p.bas - p.once)
  const son = Math.min(icerik.length - 1, p.son + p.sonra)
  const secBas = Math.min(p.secBas, p.secSon)
  const secSon = Math.max(p.secBas, p.secSon)
  const [ilkTik, setIlkTik] = useState(null) // aralık seçerken ilk tıklanan satır

  function satirTikla(i) {
    if (ilkTik == null) {
      setIlkTik(i)
      setP({ ...p, secBas: i, secSon: i })
    } else {
      setP({ ...p, secBas: ilkTik, secSon: i })
      setIlkTik(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-3" onClick={kapat}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <p className="font-bold text-[#1d4f7c]">Altyazı içeriği{etiket ? ` · ${etiket}` : ''}</p>
          <button type="button" onClick={kapat} className="rounded-sm bg-[#1d4f7c] px-3 py-1 text-sm font-bold text-white">Kapat</button>
        </div>

        <div className="flex-1 overflow-y-auto bg-black px-3 py-2 font-mono text-[15px] leading-relaxed text-white">
          {bas > 0 && (
            <button type="button" onClick={() => setP({ ...p, once: p.once + 10 })} className="mb-2 w-full rounded-sm bg-[#1d4f7c] py-1.5 text-center font-sans text-sm font-bold text-white">
              ▲ 10 satır daha önce
            </button>
          )}
          {icerik.slice(bas, son + 1).map((s, k) => {
            const i = bas + k
            const eslesen = i >= p.bas && i <= p.son
            const secili = i >= secBas && i <= secSon
            return (
              <button
                key={i}
                type="button"
                onClick={() => satirTikla(i)}
                className={`mb-1 block w-full rounded-sm px-2 py-1 text-left ${secili ? 'bg-[#1d4f7c] text-white ring-2 ring-[#ffd84d]' : eslesen ? 'bg-[#3a3000] text-[#ffe680]' : 'text-white hover:bg-white/15'}`}
              >
                <span className="block text-[13px] text-[#7fd4ff]">{zamanFormatla(s[0])} → {zamanFormatla(s[1])}</span>
                <span className="block whitespace-pre-wrap">{s[2]}</span>
              </button>
            )
          })}
          {son < icerik.length - 1 && (
            <button type="button" onClick={() => setP({ ...p, sonra: p.sonra + 10 })} className="mt-1 w-full rounded-sm bg-[#1d4f7c] py-1.5 text-center font-sans text-sm font-bold text-white">
              ▼ 10 satır daha sonra
            </button>
          )}
        </div>

        <div className="space-y-2 bg-white px-4 py-3">
          <p className="text-xs text-[#374151]">
            {ilkTik != null
              ? 'Aralığın son satırına dokun…'
              : secBas === secSon
              ? `Seçili satır: ${zamanFormatla(icerik[secBas][0])}. Birden çok satır için başlangıç ve bitiş satırına sırayla dokun.`
              : `Seçili: ${secSon - secBas + 1} satır (${zamanFormatla(icerik[secBas][0])} → ${zamanFormatla(icerik[secSon][1])})`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => notEkle(secBas, secSon, false)} className="rounded-full bg-[#7a4a14] px-4 py-1.5 text-sm font-bold text-white">📌 Seçili satırlara not ekle</button>
            <button type="button" onClick={() => notEkle(secBas, secSon, true)} className="rounded-full bg-[#14141f] px-4 py-1.5 text-sm font-bold text-[#ffd84d]">🎤 Tartışmaya ekle</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AltyaziAraci({ etkinlik, kullanici, adim, anNotlari, medya }) {
  const etkinlikId = etkinlik.id
  const [altyazilar, setAltyazilar] = useState([])
  const [yuklendi, setYuklendi] = useState(false)
  const [secili, setSecili] = useState('')
  const [icerik, setIcerik] = useState(null)
  const [icerikHatasi, setIcerikHatasi] = useState('')
  const [sorgu, setSorgu] = useState('')
  const [pencere, setPencere] = useState(null) // "İçeriği Göster" penceresi: { bas, son, once, sonra, secBas, secSon }
  const [form, setForm] = useState(null)
  const [formHata, setFormHata] = useState('')
  const [mesgul, setMesgul] = useState(false)
  // yükleme
  const [bekleyen, setBekleyen] = useState(null) // { dosyaAdi, satirlar }
  const [dil, setDil] = useState('Türkçe')
  const [surum, setSurum] = useState('')
  const [yukleHata, setYukleHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [silOnay, setSilOnay] = useState(false)

  useEffect(() => {
    return altyazilariDinle(
      etkinlikId,
      (l) => {
        setAltyazilar(l)
        setYuklendi(true)
      },
      () => setYuklendi(true)
    )
  }, [etkinlikId])

  // Altyazı seçili değilse en sonuncuyu seç.
  useEffect(() => {
    if (altyazilar.length && !altyazilar.some((a) => a.id === secili)) setSecili(altyazilar[altyazilar.length - 1].id)
    if (!altyazilar.length) setSecili('')
  }, [altyazilar, secili])

  useEffect(() => {
    setIcerik(null)
    setIcerikHatasi('')
    setPencere(null)
    if (!secili) return
    let iptal = false
    altyaziIcerigiGetir(etkinlikId, secili)
      .then((s) => !iptal && setIcerik(s))
      .catch((err) => !iptal && setIcerikHatasi(err.message))
    return () => {
      iptal = true
    }
  }, [etkinlikId, secili])

  const seciliAltyazi = altyazilar.find((a) => a.id === secili)
  const sonuclar = useMemo(() => (icerik ? replikAra(icerik, sorgu) : []), [icerik, sorgu])

  async function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    setYukleHata('')
    setBekleyen(null)
    if (dosya.size > ALTYAZI_MAKS_BAYT) {
      setYukleHata('Dosya çok büyük (en fazla 1,5 MB). Bir altyazı dosyası genelde 100 KB civarındadır.')
      return
    }
    try {
      const satirlar = srtCoz(await dosyaMetniOku(dosya))
      setBekleyen({ dosyaAdi: dosya.name, satirlar })
    } catch (err) {
      setYukleHata(err.message)
    }
  }

  async function yukle() {
    setYukleniyor(true)
    setYukleHata('')
    try {
      const id = await altyaziYukle(etkinlikId, kullanici, adim, { dil, surum, dosyaAdi: bekleyen.dosyaAdi, satirlar: bekleyen.satirlar })
      setBekleyen(null)
      setSurum('')
      setSecili(id)
    } catch (err) {
      setYukleHata(err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  async function altyaziyiSil() {
    if (!silOnay) {
      setSilOnay(true)
      return
    }
    try {
      await altyaziSil(etkinlikId, secili)
    } catch (err) {
      setYukleHata(err.message)
    } finally {
      setSilOnay(false)
    }
  }

  function formAc(ayar) {
    setFormHata('')
    setForm(bosForm(ayar))
    window.scrollTo?.({ top: document.getElementById('altyazi-form-yeri')?.offsetTop - 80 || 0, behavior: 'smooth' })
  }

  function satirdanForm(bas, son, slaytta = false) {
    const metin = icerik
      .slice(bas, son + 1)
      .map((s) => s[2])
      .join('\n')
    formAc({
      altyaziId: secili,
      altyaziEtiketi: seciliAltyazi ? etiketle(seciliAltyazi) : '',
      satirNo: bas,
      orijinalMs: icerik[bas][0],
      hedef: zamanFormatla(icerik[bas][0]),
      replik: metin.slice(0, 700),
      slaytta,
      gorunurluk: slaytta ? 'kulup' : 'ozel',
    })
  }

  function notuDuzenle(n) {
    formAc({
      id: n.id,
      altyaziId: n.altyaziId || '',
      altyaziEtiketi: n.altyaziEtiketi || '',
      satirNo: n.satirNo ?? null,
      orijinalMs: n.orijinalMs ?? null,
      hedef: zamanFormatla(n.hedefMs),
      replik: n.replik || '',
      yorum: n.yorum || '',
      soru: n.soru || '',
      gorunurluk: n.gorunurluk || 'ozel',
      slaytta: !!n.slaytta,
      yorumAcik: !!n.yorumAcik,
      medyaId: n.medyaId || '',
    })
  }

  async function notuKaydet() {
    const hedefMs = zamanCoz(form.hedef)
    if (hedefMs == null) {
      setFormHata('Zaman kodunu 00:42:18 ya da 42:18 biçiminde yaz.')
      return
    }
    if (!form.yorum.trim() && !form.soru.trim() && !form.replik.trim()) {
      setFormHata('En az bir replik, yorum ya da soru yazmalısın.')
      return
    }
    setMesgul(true)
    setFormHata('')
    try {
      if (form.id) await anNotuGuncelle(etkinlikId, form.id, kullanici, adim, { ...form, hedefMs })
      else await anNotuEkle(etkinlikId, kullanici, adim, { ...form, hedefMs })
      setForm(null)
    } catch (err) {
      setFormHata(`Kaydedilemedi: ${err.message}`)
    } finally {
      setMesgul(false)
    }
  }

  const seciliMedya = (id) => medya.find((m) => m.id === id)
  const kareVeKesitler = medya.filter((m) => ['kare', 'video'].includes(m.tur))

  return (
    <div>
      <h2 className="mb-1 mt-6 font-baslik text-lg text-murekkep">💬 Altyazı: Repliği Bul</h2>
      <p className="mb-3 text-xs text-kraft">
        Hatırladığın bir kelimeyle sahneyi bul, o ana gözlemini bağla, istersen Zoom tartışmasına taşı. Altyazı dosyası yalnızca kulüp üyelerine açıktır; sitede film oynatılmaz.
      </p>

      {/* Altyazı seçimi / yükleme */}
      <div className="mb-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
        {altyazilar.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-murekkep">Altyazı:</label>
            <select value={secili} onChange={(e) => setSecili(e.target.value)} className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi">
              {altyazilar.map((a) => (
                <option key={a.id} value={a.id}>
                  {etiketle(a)} ({a.satirSayisi} satır, {zamanFormatla(a.sureMs)})
                </option>
              ))}
            </select>
            {seciliAltyazi?.ekleyenId === kullanici.uid && (
              <button type="button" onClick={altyaziyiSil} className={`text-[11px] ${silOnay ? 'font-bold text-muhur' : 'text-kraft hover:text-muhur'}`}>
                {silOnay ? 'Emin misin? Altyazıyı sil (notların alıntıları saklanır)' : '🗑️ Sil'}
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-sm bg-kagit px-3 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
            📄 {altyazilar.length ? 'Başka Bir .srt Yükle' : '.srt Altyazı Yükle'}
            <input type="file" accept=".srt,text/plain,application/x-subrip" onChange={dosyaSecildi} className="hidden" />
          </label>
          {bekleyen && (
            <>
              <span className="text-[11px] text-kraft">
                ✓ {bekleyen.dosyaAdi}: {bekleyen.satirlar.length} satır, {zamanFormatla(bekleyen.satirlar[bekleyen.satirlar.length - 1][1])}
              </span>
              <select value={dil} onChange={(e) => setDil(e.target.value)} className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi">
                {['Türkçe', 'İngilizce', 'Orijinal dil', 'Diğer'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <input value={surum} onChange={(e) => setSurum(e.target.value)} maxLength={120} placeholder="Film sürümü (örn. BluRay 1080p, 24 fps)" className="min-w-[12rem] flex-1 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi" />
              <button onClick={yukle} disabled={yukleniyor} className="rounded-full bg-gise px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
                {yukleniyor ? 'Yükleniyor…' : 'Altyazıyı Yükle'}
              </button>
            </>
          )}
        </div>
        {yukleHata && <p className="mt-2 text-xs text-muhur">{yukleHata}</p>}
        <p className="mt-2 text-[10px] text-kraft">
          Altyazı zamanı ile izlediğin kopyanın zamanı kaymış olabilir: not eklerken zaman kodunu düzeltebilirsin, özgün altyazı kodu korunur. Yeni yükleme eskisinin üzerine yazmaz.
        </p>
      </div>

      <div id="altyazi-form-yeri" />
      {form && <AnNotuFormu form={form} setForm={setForm} medya={kareVeKesitler} kaydet={notuKaydet} vazgec={() => setForm(null)} mesgul={mesgul} hata={formHata} />}

      {/* Arama */}
      {secili && (
        <div className="mb-4">
          <input
            type="search"
            value={sorgu}
            onChange={(e) => setSorgu(e.target.value)}
            placeholder={icerik ? 'Hatırladığın kelime ya da ifade… (ör. "burada kalamam")' : 'Altyazı yükleniyor…'}
            disabled={!icerik}
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          {icerikHatasi && <p className="mt-1 text-xs text-muhur">{icerikHatasi}</p>}
          {sorgu.trim().length >= 2 && icerik && (
            <p className="mt-1 text-[11px] text-kraft">
              {sonuclar.length === 0 ? 'Eşleşen replik bulunamadı.' : `${sonuclar.length}${sonuclar.length >= 40 ? '+' : ''} sonuç`} · Türkçe harf yazmasan da bulur ("gorusuruz" → "görüşürüz").
            </p>
          )}
          <div className="mt-2 space-y-2">
            {sonuclar.map((r) => (
              <div key={r.bas} className="rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
                {icerik.slice(r.bas, r.son + 1).map((s, k) => (
                  <div key={r.bas + k} className="flex items-start gap-2 py-0.5 text-sm text-murekkep">
                    <span className="w-16 shrink-0 font-mono text-xs text-deniz">{zamanFormatla(s[0])}</span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap font-bold">{s[2]}</span>
                  </div>
                ))}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <button type="button" onClick={() => satirdanForm(r.bas, r.son)} className="rounded-full bg-gise px-2.5 py-1 text-kagit">📌 Bu ana not ekle</button>
                  <button type="button" onClick={() => satirdanForm(r.bas, r.son, true)} className="rounded-full bg-murekkep px-2.5 py-1 text-kagit">🎤 Tartışmaya ekle</button>
                  <button
                    type="button"
                    onClick={() => setPencere({ bas: r.bas, son: r.son, once: 10, sonra: 10, secBas: r.bas, secSon: r.son })}
                    className="rounded-full bg-kagit px-2.5 py-1 text-murekkep ring-1 ring-cizgi"
                  >
                    📖 İçeriği Göster
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {yuklendi && !secili && <p className="mb-3 text-xs text-kraft">Henüz altyazı yüklenmedi. Altyazı olmadan da zaman koduyla not ekleyebilirsin.</p>}

      <div className="mb-3">
        <button type="button" onClick={() => formAc({})} className="rounded-sm bg-kagitKoyu px-3 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
          ⏱️ Diyalogsuz sahne: zaman koduyla not ekle
        </button>
      </div>

      {/* An notları */}
      <h3 className="mb-2 font-baslik text-base text-murekkep">🎬 Anlar ({anNotlari.length})</h3>
      {anNotlari.length === 0 ? (
        <p className="text-xs text-kraft">Henüz an notu yok.</p>
      ) : (
        <div className="space-y-2">
          {anNotlari.map((n) => {
            const benim = n.kullaniciId === kullanici.uid
            const kaynakKayip = n.altyaziId && yuklendi && !altyazilar.some((a) => a.id === n.altyaziId)
            const m = n.medyaId ? seciliMedya(n.medyaId) : null
            return (
              <div key={n.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-sm font-bold text-deniz">{zamanFormatla(n.hedefMs)}</span>
                  {n.orijinalMs != null && n.orijinalMs !== n.hedefMs && <span className="text-[10px] text-kraft">(altyazı: {zamanFormatla(n.orijinalMs)})</span>}
                  <span className="text-kraft">· {n.kullaniciAdi || 'Üye'}</span>
                  <span className="rounded-full bg-kagit px-2 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi">
                    {n.slaytta ? '🎤 Tartışmada' : n.gorunurluk === 'kulup' ? '👥 Kulüple paylaşıldı' : '🔒 Özel'}
                  </span>
                  {benim && (
                    <span className="ml-auto flex gap-2 text-[11px]">
                      <button type="button" onClick={() => notuDuzenle(n)} className="text-deniz hover:underline">Düzenle</button>
                      <button type="button" onClick={() => anNotuSil(etkinlikId, n.id).catch((err) => setFormHata(err.message))} className="text-kraft hover:text-muhur">Sil</button>
                    </span>
                  )}
                </div>
                {n.replik && <p className="mt-1 whitespace-pre-wrap text-sm italic text-murekkep">“{n.replik}”</p>}
                {n.soru && <p className="mt-1 text-sm text-murekkep">💬 {n.soru}</p>}
                {n.yorum && <p className="mt-1 whitespace-pre-wrap text-sm text-kraft">{n.yorum}</p>}
                {m && <p className="mt-1 text-[11px] text-kraft">{m.tur === 'kare' ? '🖼️' : '🎬'} {m.baslik || (m.tur === 'kare' ? 'Kare' : 'Kesit')}</p>}
                {n.altyaziEtiketi && <p className="mt-1 text-[10px] text-kraft">Kaynak: {n.altyaziEtiketi}</p>}
                {kaynakKayip && <p className="mt-1 text-[10px] text-muhur">ℹ️ Kaynak altyazı dosyası kaldırılmış; alıntı ve zaman kodu notla birlikte saklanıyor.</p>}
              </div>
            )
          })}
        </div>
      )}
      {formHata && !form && <p className="mt-2 text-xs text-muhur">{formHata}</p>}
      {pencere && icerik && (
        <AltyaziPenceresi
          icerik={icerik}
          p={pencere}
          setP={setPencere}
          etiket={seciliAltyazi ? etiketle(seciliAltyazi) : ''}
          kapat={() => setPencere(null)}
          notEkle={(bas, son, slaytta) => {
            setPencere(null)
            satirdanForm(bas, son, slaytta)
          }}
        />
      )}
    </div>
  )
}
