import { createPortal } from 'react-dom'
import { INCELEME_BOLUMLERI, SAHNE_ALANLARI } from '../utils/incelemeDefteri.js'

// A4 yazdırma şablonu: sinemasal başlık bandı (film şeridi delikleri), künye
// (afiş, yönetmen, oyuncular…), renkli çizgili bölüm kutuları ve puanlama alanı.
// mod = 'bos'  → kutular boş, elle yazmak için;
// mod = 'dolu' → defterdeki ortak yazılar + yazdıran kişinin sahne/kişisel notları basılır.
// Dolu modda kutular yazıya göre UZAR (metin asla kesilmez; gerekirse ek sayfaya taşar).
// Ekranda gizli, sadece yazdırırken görünür (bkz. aşağıdaki stil bloğu).
const SATIR = 24
const STIL = `
@media screen { .yazdir-kok { display: none; } }
@media print {
  @page { size: A4; margin: 9mm; }
  html, body, #root { background: #fff !important; }
  /* Şablon doğrudan <body>'ye taşınıyor (portal); uygulamanın geri kalanı yazdırmada tamamen gizli,
     böylece boş fazladan sayfa çıkmıyor. */
  body > *:not(.yazdir-kok) { display: none !important; }
  .yazdir-kok { display: block; width: 100%; }
  .yazdir-kok, .yazdir-kok * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
}
.yazdir-kok { font-family: Georgia, 'Times New Roman', serif; color: #111118; }
.yz-bant { background: #14141f; color: #f5c518; padding: 10px 14px; border-radius: 6px; position: relative; }
.yz-delik { height: 9px; margin: 0 -14px; background: repeating-linear-gradient(90deg, transparent 0 8px, #f5f0e1 8px 16px); opacity: .9; }
.yz-delik.ust { margin-bottom: 6px; } .yz-delik.alt { margin-top: 6px; }
.yz-kutu { border: 1.5px solid; border-radius: 6px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; background: #fff; }
.yz-kutu-baslik { color: #fff; font: bold 10.5px/1 Arial, sans-serif; padding: 4px 7px; letter-spacing: .3px; display: flex; justify-content: space-between; gap: 6px; }
.yz-kutu-baslik small { font-weight: normal; font-size: 8.5px; opacity: .95; }
.yz-kutu-ipucu { font: italic 8.8px/1.25 Arial, sans-serif; color: #374151; padding: 3px 7px 0; }
.yz-alt-etiket { font: bold 9px/1 Arial, sans-serif; color: #111118; padding: 4px 7px 0; }
.yz-cizgi { line-height: ${SATIR}px; font-size: 10.5px; padding: 0 7px; white-space: pre-wrap; overflow-wrap: anywhere; }
.yz-daire { width: 21px; height: 21px; border: 1.8px solid #14141f; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font: bold 10px Arial, sans-serif; margin-right: 4px; }
.yz-daire.dolu { background: #f5c518; border-color: #b8860b; }
`

// Türkçe büyük harf (i → İ, ı → I): toUpperCase() bunu yapmaz.
const buyuk = (t) => (t || '').toLocaleUpperCase('tr-TR')

// Yazının kaç satır tutacağının kaba (muhafazakâr) tahmini; kutu bu kadar satıra uzar.
function satirTahmin(metin, karakterSatir) {
  if (!metin) return 0
  return metin.split('\n').reduce((t, p) => t + Math.max(1, Math.ceil(p.length / karakterSatir)), 0)
}

// Çizgiler gradyan yerine gerçek satırlar: Chromium yazdırmada gradyanlı çizgiler bazı kutularda kayboluyordu.
function Cizgiler({ metin, satir, genis }) {
  const n = Math.max(satir, satirTahmin(metin, genis ? 105 : 52))
  return (
    <div style={{ position: 'relative', marginTop: 2, height: n * SATIR }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ height: SATIR, borderBottom: '1px solid #8b94a5' }} />
      ))}
      <div className="yz-cizgi" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
        {metin || ''}
      </div>
    </div>
  )
}

function Kutu({ bolum, metin, satir = 5, genis = false, etiket }) {
  return (
    <div className="yz-kutu" style={{ borderColor: bolum.renk }}>
      <div className="yz-kutu-baslik" style={{ background: bolum.renk }}>
        <span>
          {bolum.ikon} {buyuk(bolum.baslik)}
        </span>
        {etiket && <small>{etiket}</small>}
      </div>
      {bolum.ipucu && <div className="yz-kutu-ipucu">{bolum.ipucu}</div>}
      <Cizgiler metin={metin} satir={satir} genis={genis} />
    </div>
  )
}

// Yakın Okuma: tam genişlikte, 4 alt alanlı kutu (sahne / gördüğüm / etki / başka okuma).
function YakinOkumaKutusu({ sahne, dolu, ad }) {
  const renk = '#7a1f3d'
  const alanlar = SAHNE_ALANLARI.filter((a) => a.id !== 'soru')
  return (
    <div className="yz-kutu" style={{ borderColor: renk, marginTop: 10 }}>
      <div className="yz-kutu-baslik" style={{ background: renk }}>
        <span>🎞️ YAKIN OKUMA: BİR SAHNE</span>
        {dolu && ad && <small>{ad}</small>}
      </div>
      <div className="yz-kutu-ipucu">Sahne seç → ne gördüğünü tarif et → etkisini yorumla → başka okuma mümkün mü diye sor.</div>
      {alanlar.map((a) => {
        const metin = dolu ? sahne?.[a.id] : ''
        return (
          <div key={a.id}>
            <div className="yz-alt-etiket">{a.etiket}</div>
            <Cizgiler metin={metin} satir={a.satir === 1 ? 1 : 3} genis />
          </div>
        )
      })}
    </div>
  )
}

function Daireler({ secili }) {
  return (
    <span>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`yz-daire ${secili === i + 1 ? 'dolu' : ''}`}>
          {i + 1}
        </span>
      ))}
    </span>
  )
}

export default function IncelemeYazdirma({ mod, etkinlik, kunye, bolumler, kisiselNot, puanlar, benimPuanim, benimCumlem, kullaniciAdi, sahne, digerSorular }) {
  if (!mod) return null
  const dolu = mod === 'dolu'
  const tarih = etkinlik.tarih ? new Date(etkinlik.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const SAYFA_1 = ['konu', 'karakterler', 'gorsel', 'kurgu']
  const sayfa1 = INCELEME_BOLUMLERI.filter((b) => SAYFA_1.includes(b.id))
  const sayfa2 = INCELEME_BOLUMLERI.filter((b) => !SAYFA_1.includes(b.id))
  const bolumMetni = (id) => (dolu ? bolumler?.[id]?.metin : '')
  // "Son düzenleyen" bilgisi: ortak bölümde kimin yazdığı basılı çıktıda da görünsün.
  const bolumEtiketi = (id) => (dolu && bolumler?.[id]?.metin ? bolumler[id].guncelleyenAd : '')

  return createPortal(
    <div className="yazdir-kok">
      <style>{STIL}</style>

      {/* Başlık bandı */}
      <div className="yz-bant">
        <div className="yz-delik ust" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', font: 'bold 11px Arial, sans-serif', letterSpacing: 1 }}>
          <span>🎬 FİLM İNCELEME FORMU · 1/2</span>
          <span style={{ color: '#f5f0e1', fontWeight: 'normal' }}>
            {etkinlik.topluluklAd} {tarih && `· ${tarih}`}
          </span>
        </div>
        <div className="yz-delik alt" />
      </div>

      {/* Künye (afiş yoksa boş çerçeve çizilmez; künye sola yaslanır) */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        {etkinlik.eserPosterUrl && (
          <div style={{ width: 100, flexShrink: 0 }}>
            <img src={etkinlik.eserPosterUrl} alt="" style={{ width: 100, borderRadius: 4, border: '2px solid #14141f' }} />
          </div>
        )}
        <div style={{ flex: 1, fontSize: 11, lineHeight: 1.45, minWidth: 0 }}>
          <div style={{ font: 'bold 22px/1.1 Georgia, serif', color: '#14141f', overflowWrap: 'anywhere' }}>{etkinlik.eserBaslik}</div>
          {kunye?.orijinalBaslik && kunye.orijinalBaslik !== etkinlik.eserBaslik && (
            <div style={{ fontStyle: 'italic', color: '#374151', overflowWrap: 'anywhere' }}>{kunye.orijinalBaslik}</div>
          )}
          <div style={{ margin: '4px 0', color: '#8a6508', fontWeight: 'bold' }}>
            {[etkinlik.eserYil, kunye?.sureDk && `${kunye.sureDk} dk`, kunye?.turler?.join(', '), kunye?.ulkeler?.join(', ')].filter(Boolean).join('  ·  ')}
          </div>
          {kunye?.yonetmenler?.length > 0 && (
            <div>
              <b>Yönetmen:</b> {kunye.yonetmenler.join(', ')}
            </div>
          )}
          {kunye?.senaristler?.length > 0 && (
            <div>
              <b>Senaryo:</b> {kunye.senaristler.join(', ')}
            </div>
          )}
          {kunye?.oyuncular?.length > 0 && (
            <div>
              <b>Oyuncular:</b> {kunye.oyuncular.join(', ')}
            </div>
          )}
          {kunye?.ozet && <div style={{ marginTop: 4, fontSize: 9, color: '#374151', maxHeight: 48, overflow: 'hidden' }}>{kunye.ozet}</div>}
          <div style={{ marginTop: 5, fontSize: 10 }}>
            İzleyen: <span style={{ display: 'inline-block', width: 160, borderBottom: '1px solid #14141f' }}>{dolu ? kullaniciAdi : ''}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, padding: '5px 8px', background: '#fffbea', border: '1px dashed #b8860b', borderRadius: 4, font: 'italic 9.5px Arial, sans-serif' }}>
        Hepsini doldurmak gerekmiyor. Bir sahne ve bir tartışma sorusu yeter.
      </div>

      {/* 1. sayfa: yakın okuma + yardımcı kutular */}
      <YakinOkumaKutusu sahne={sahne} dolu={dolu} ad={kullaniciAdi} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        {sayfa1.map((b) => (
          <Kutu key={b.id} bolum={b} metin={bolumMetni(b.id)} satir={6} etiket={bolumEtiketi(b.id)} />
        ))}
      </div>

      {/* 2. sayfa */}
      <div style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
        <div className="yz-bant" style={{ padding: '6px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: 'bold 11px Arial, sans-serif', letterSpacing: 1 }}>
            <span>🎬 {buyuk(etkinlik.eserBaslik)}</span>
            <span style={{ color: '#f5f0e1', fontWeight: 'normal' }}>İnceleme Formu · 2/2</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {sayfa2.map((b) => (
            <Kutu key={b.id} bolum={b} metin={bolumMetni(b.id)} satir={5} etiket={bolumEtiketi(b.id)} />
          ))}
        </div>

        {/* Zoom'a götüreceğim soru */}
        <div style={{ marginTop: 8 }}>
          <Kutu
            bolum={{ id: 'zoom', baslik: "Zoom'a Götüreceğim Soru", ikon: '💬', renk: '#1565C0', ipucu: 'Grubun farklı cevaplar verebileceği bir soru. Mümkünse bir sahneye bağla.' }}
            metin={dolu ? sahne?.soru : ''}
            satir={3}
            genis
            etiket={dolu ? kullaniciAdi : ''}
          />
          {dolu && digerSorular?.length > 0 && (
            <div style={{ fontSize: 9.5, marginTop: 3, lineHeight: 1.4 }}>
              <b>Diğer üyelerin soruları:</b>
              {digerSorular.map((d, i) => (
                <div key={i}>
                  • <b>{d.ad}:</b> {d.soru}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kişisel notlar */}
        <div style={{ marginTop: 8 }}>
          <Kutu
            bolum={{ id: 'kisisel', baslik: 'Kişisel Notlarım', ikon: '✍️', renk: '#37474F', ipucu: 'Sadece bana ait: ilk izlenim, sorular, aklıma takılanlar…' }}
            metin={dolu ? kisiselNot : ''}
            satir={7}
            genis
          />
          <div style={{ fontSize: 9.5, marginTop: 4 }}>
            <b>Toplantıdan sonra — görüşümü değiştiren bir yorum:</b>
            <div style={{ borderBottom: '1px solid #14141f', height: 18 }} />
          </div>
        </div>

        {/* Puanlama (isteğe bağlı, en sonda) */}
        <div style={{ marginTop: 8, border: '2px solid #14141f', borderRadius: 6, padding: '8px 10px', breakInside: 'avoid', background: '#fffbea' }}>
          <div style={{ font: 'bold 11px Arial, sans-serif', letterSpacing: 1, marginBottom: 6 }}>⭐ PUANLAMA (isteğe bağlı)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b style={{ fontSize: 11, width: 52 }}>Puanım</b>
            <Daireler secili={dolu ? benimPuanim : null} />
          </div>
          <div style={{ marginTop: 7, fontSize: 11 }}>
            <b>Tek cümlelik hüküm (en fazla 12 kelime):</b>
            <div style={{ borderBottom: '1px solid #14141f', height: 20, fontStyle: 'italic' }}>{dolu && benimCumlem ? `“${benimCumlem}”` : ''}</div>
          </div>
          {dolu && puanlar?.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 10.5 }}>
              <b>Kulüp puanları:</b>{' '}
              {puanlar
                .filter((p) => p.puan != null)
                .map((p) => `${p.kullaniciAdi.split(' ')[0]}: ${p.puan * 2}`)
                .join('   ·   ')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
