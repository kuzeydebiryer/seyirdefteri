import { INCELEME_BOLUMLERI, SAHNE_ALANLARI } from '../utils/incelemeDefteri.js'
import { zamanFormatla } from '../utils/altyazi.js'

// Toplantı sonrası "Kulüp Özeti" belgesi: künye, puanlar, her üyenin Yakın Okuma notları,
// Zoom soruları ve ortak defter. Renkler sabit (tema bağımsız): hem ekranda beyaz bir
// kâğıt gibi görünür hem de olduğu gibi yazdırılır / PDF'e kaydedilir.
const STIL = `
.oz { font-family: Georgia, 'Times New Roman', serif; color: #111118; background: #fff; }
.oz * { box-sizing: border-box; }
.oz-bant { background: #14141f; color: #f5c518; padding: 10px 14px; border-radius: 6px; }
.oz-delik { height: 8px; margin: 0 -14px; background: repeating-linear-gradient(90deg, transparent 0 8px, #f5f0e1 8px 16px); }
.oz-baslik { font: bold 13px Arial, sans-serif; letter-spacing: .5px; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #14141f; }
.oz-kutu { border: 1.5px solid; border-radius: 6px; overflow: hidden; margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; }
.oz-kutu-b { color: #fff; font: bold 11px Arial, sans-serif; padding: 4px 8px; display: flex; justify-content: space-between; gap: 8px; }
.oz-kutu-b small { font-weight: normal; font-size: 9px; }
.oz-metin { padding: 6px 8px; font-size: 11.5px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.oz-et { font: bold 9px Arial, sans-serif; text-transform: uppercase; letter-spacing: .5px; color: #6b4e00; margin-top: 4px; }
`

const tr = (t) => (t || '').toLocaleUpperCase('tr-TR')

export default function OzetBelge({ etkinlik, kunye, puanlar, sahneKayitlari, bolumler, medya, anNotlari }) {
  const tarih = etkinlik.tarih
    ? new Date(etkinlik.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const puanli = (puanlar || []).filter((p) => p.puan != null || p.cumle)
  const dolu = (puanlar || []).filter((p) => p.puan != null)
  const ort = dolu.length ? ((dolu.reduce((t, p) => t + p.puan, 0) / dolu.length) * 2).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null
  const sirali = [...(sahneKayitlari || [])].sort((a, b) => (a.kullaniciAdi || '').localeCompare(b.kullaniciAdi || '', 'tr'))
  const sahneliler = sirali.filter((k) => ['sahne', 'gordugum', 'etki', 'baska'].some((a) => k[a]))
  const sorulular = sirali.filter((k) => k.soru?.trim())
  // Özete yalnızca tartışmaya taşınan, kulüple paylaşılmış anlar girer; yorum ancak üye izin verdiyse.
  const anlar = (anNotlari || []).filter((n) => n.slaytta && n.gorunurluk === 'kulup')
  const kareler = (medya || []).filter((m) => m.tur === 'kare')
  const kaynaklar = (medya || []).filter((m) => m.tur !== 'kare')
  const KAYNAK_IKON = { video: '🎬', muzik: '🎵', sosyal: '📣' }
  const doluBolumler = INCELEME_BOLUMLERI.filter((b) => bolumler?.[b.id]?.metin?.trim())

  return (
    <div className="oz" style={{ padding: 14 }}>
      <style>{STIL}</style>

      <div className="oz-bant">
        <div className="oz-delik" style={{ marginBottom: 6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', font: 'bold 12px Arial, sans-serif', letterSpacing: 1 }}>
          <span>🎬 KULÜP İNCELEME ÖZETİ</span>
          <span style={{ color: '#f5f0e1', fontWeight: 'normal' }}>
            {etkinlik.topluluklAd} {tarih && `· ${tarih}`}
          </span>
        </div>
        <div className="oz-delik" style={{ marginTop: 6 }} />
      </div>

      {/* Künye */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
        {etkinlik.eserPosterUrl && <img src={etkinlik.eserPosterUrl} alt="" style={{ width: 100, height: 'fit-content', borderRadius: 4, border: '2px solid #14141f' }} />}
        <div style={{ fontSize: 12, lineHeight: 1.5, minWidth: 0 }}>
          <div style={{ font: 'bold 24px/1.1 Georgia, serif', overflowWrap: 'anywhere' }}>{etkinlik.eserBaslik}</div>
          {kunye?.orijinalBaslik && kunye.orijinalBaslik !== etkinlik.eserBaslik && <div style={{ fontStyle: 'italic', color: '#374151' }}>{kunye.orijinalBaslik}</div>}
          <div style={{ margin: '4px 0', color: '#8a6508', fontWeight: 'bold' }}>
            {[etkinlik.eserYil, kunye?.sureDk && `${kunye.sureDk} dk`, kunye?.turler?.join(', '), kunye?.ulkeler?.join(', ')].filter(Boolean).join('  ·  ')}
          </div>
          {kunye?.yonetmenler?.length > 0 && <div><b>Yönetmen:</b> {kunye.yonetmenler.join(', ')}</div>}
          {kunye?.senaristler?.length > 0 && <div><b>Senaryo:</b> {kunye.senaristler.join(', ')}</div>}
          {kunye?.oyuncular?.length > 0 && <div><b>Oyuncular:</b> {kunye.oyuncular.join(', ')}</div>}
        </div>
      </div>

      {/* Puanlar */}
      <div className="oz-baslik">⭐ KULÜP PUANLARI{ort ? ` · ORTALAMA ${ort}/10` : ''}</div>
      {puanli.length === 0 ? (
        <p style={{ fontSize: 11.5, color: '#6b7280' }}>Henüz puan veren yok.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <tbody>
            {puanli.map((p) => (
              <tr key={p.kullaniciId} style={{ borderBottom: '1px solid #cbd0da', breakInside: 'avoid' }}>
                <td style={{ padding: '4px 6px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{p.kullaniciAdi}</td>
                <td style={{ padding: '4px 6px', fontWeight: 'bold', color: '#8a6508', whiteSpace: 'nowrap' }}>{p.puan != null ? `${p.puan * 2}/10` : '-'}</td>
                <td style={{ padding: '4px 6px', fontStyle: 'italic' }}>{p.cumle ? `“${p.cumle}”` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Yakın okuma */}
      {sahneliler.length > 0 && <div className="oz-baslik">🎞️ YAKIN OKUMA: ÜYELERİN SAHNELERİ</div>}
      {sahneliler.map((k) => (
        <div key={k.id} className="oz-kutu" style={{ borderColor: '#7a1f3d' }}>
          <div className="oz-kutu-b" style={{ background: '#7a1f3d' }}>
            <span>{tr(k.kullaniciAdi || 'Üye')}</span>
            {k.sahne && <small>{k.sahne}</small>}
          </div>
          <div className="oz-metin">
            {SAHNE_ALANLARI.filter((a) => !['sahne', 'soru'].includes(a.id) && k[a.id]).map((a) => (
              <div key={a.id}>
                <div className="oz-et">{a.etiket}</div>
                {k[a.id]}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Zoom soruları */}
      {sorulular.length > 0 && <div className="oz-baslik">💬 ZOOM'A GÖTÜRÜLEN SORULAR</div>}
      {sorulular.map((k) => (
        <div key={k.id} style={{ fontSize: 12, margin: '4px 0', breakInside: 'avoid' }}>
          <b>{k.kullaniciAdi}:</b> {k.soru}
          {k.sahne && <span style={{ color: '#6b7280' }}> (sahne: {k.sahne})</span>}
        </div>
      ))}

      {/* Tartışmaya taşınan anlar */}
      {anlar.length > 0 && <div className="oz-baslik">⏱ TARTIŞMAYA TAŞINAN ANLAR</div>}
      {anlar.map((n) => (
        <div key={n.id} className="oz-kutu" style={{ borderColor: '#1565C0' }}>
          <div className="oz-kutu-b" style={{ background: '#1565C0' }}>
            <span>⏱ {zamanFormatla(n.hedefMs)}</span>
            <small>{n.kullaniciAdi}</small>
          </div>
          <div className="oz-metin">
            {n.replik && <div style={{ fontStyle: 'italic' }}>“{n.replik}”</div>}
            {n.soru && <div style={{ marginTop: 3 }}><b>Soru:</b> {n.soru}</div>}
            {n.yorumAcik && n.yorum && <div style={{ marginTop: 3, color: '#374151' }}><b>Yorum:</b> {n.yorum}</div>}
          </div>
        </div>
      ))}

      {/* Kareler */}
      {kareler.length > 0 && <div className="oz-baslik">🖼️ KARELER</div>}
      {kareler.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {kareler.map((m) => (
            <div key={m.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <img src={m.url} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 4, border: '1px solid #14141f' }} />
              {m.baslik && <div style={{ fontSize: 10, lineHeight: 1.3, marginTop: 2 }}>{m.baslik}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Eklenen kaynaklar (kesit / müzik / paylaşım) */}
      {kaynaklar.length > 0 && <div className="oz-baslik">🔗 EKLENEN KAYNAKLAR</div>}
      {kaynaklar.map((m) => (
        <div key={m.id} style={{ fontSize: 11, margin: '3px 0', breakInside: 'avoid', overflowWrap: 'anywhere' }}>
          {KAYNAK_IKON[m.tur]} <b>{m.baslik || 'Bağlantı'}</b> <span style={{ color: '#6b7280' }}>({m.ekleyenAd || 'Üye'})</span>
          <div style={{ color: '#1565C0', fontSize: 10 }}>{m.url}</div>
        </div>
      ))}

      {/* Ortak defter */}
      {doluBolumler.length > 0 && <div className="oz-baslik">📓 ORTAK DEFTER</div>}
      {doluBolumler.map((b) => (
        <div key={b.id} className="oz-kutu" style={{ borderColor: b.renk }}>
          <div className="oz-kutu-b" style={{ background: b.renk }}>
            <span>
              {b.ikon} {tr(b.baslik)}
            </span>
            {bolumler[b.id].guncelleyenAd && <small>{bolumler[b.id].guncelleyenAd}</small>}
          </div>
          <div className="oz-metin">{bolumler[b.id].metin}</div>
        </div>
      ))}

      {sahneliler.length === 0 && sorulular.length === 0 && doluBolumler.length === 0 && kareler.length === 0 && kaynaklar.length === 0 && anlar.length === 0 && (
        <p style={{ marginTop: 16, fontSize: 12, color: '#6b7280' }}>Bu etkinlik için henüz defter notu yazılmamış.</p>
      )}
    </div>
  )
}
