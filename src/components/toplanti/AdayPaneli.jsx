import { useState } from 'react'
import { oneriEkle } from '../../utils/etkinlikOnerisi.js'
import { adayaOyVer, adayOyumuGeriCek, kazananiEtkinlikYap } from '../../utils/odaEkrani.js'
import YapimArama from './YapimArama.jsx'

// 🗳️ Gelecek film oylaması (tek oy). Adaylar topluluğun kalıcı "Etkinlik Önerileri" havuzundan
// gelir (film sayfasındaki "Kulübe aday öner" ya da topluluk sayfası); odada da eklenebilir.
// Moderatör: oylamayı başlatır/bitirir, kazananı tarih seçerek gelecek etkinlik yapar.

const ALTIN = '#C9A227'

function Dugme({ children, onClick, disabled, birincil }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${birincil ? 'text-[#0b0b10]' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20'}`}
      style={birincil ? { background: ALTIN } : undefined}
    >
      {children}
    </button>
  )
}

export default function AdayPaneli({ etkinlik, topluluk, sonuc, oylar, oylama, benimUid, adim, moderatorMu, durumYaz, yansit, oylariSifirla }) {
  const [ekleAcik, setEkleAcik] = useState(false)
  const [tarih, setTarih] = useState('')
  const [mesgul, setMesgul] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const benimOyum = oylar.find((o) => o.uid === benimUid)?.oneriId
  const kazanan = sonuc.find((a) => a.id === oylama.kazananId)

  async function islem(fn, basari) {
    setMesgul(true)
    setMesaj('')
    try {
      await fn()
      if (basari) setMesaj(basari)
    } catch (e) {
      setMesaj(e?.message?.includes('permission') ? 'Bu işlem için yetkin yok ya da oylama kapalı.' : e?.message || 'İşlem yapılamadı.')
    } finally {
      setMesgul(false)
    }
  }

  const adayEkle = (eser) =>
    islem(
      () => oneriEkle(topluluk.id, { eser, not: 'Sinema Odası’nda önerildi', topluluk, kullanici: { uid: benimUid, displayName: adim } }),
      `“${eser.eserBaslik}” adaylara eklendi.`
    )

  const baslat = () =>
    islem(async () => {
      await durumYaz({ adayOylamasi: { durum: 'acik', kazananId: '' } })
      await yansit({ tur: 'aday' })
    })
  const bitir = () => islem(() => durumYaz({ adayOylamasi: { durum: 'bitti', kazananId: sonuc[0]?.oy ? sonuc[0].id : '' } }))
  const beraberMi = oylama.durum === 'bitti' && sonuc.length > 1 && sonuc[0].oy > 0 && sonuc[0].oy === sonuc[1].oy

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-[#d9d2c3]">
        Adaylar kulübün <b className="text-white">Etkinlik Önerileri</b> havuzundan gelir; film sayfalarındaki “Kulübe aday öner” ile hafta boyunca eklenebilir. Herkesin tek oyu var.
      </p>

      {moderatorMu && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-sm bg-white/5 p-2 ring-1 ring-white/10">
          {oylama.durum !== 'acik' && (
            <Dugme birincil disabled={mesgul || sonuc.length === 0} onClick={baslat}>
              🗳️ {oylama.durum === 'bitti' ? 'Oylamayı yeniden aç' : 'Oylamayı başlat'}
            </Dugme>
          )}
          {oylama.durum === 'acik' && (
            <Dugme birincil disabled={mesgul} onClick={bitir}>
              🏁 Oylamayı bitir
            </Dugme>
          )}
          {oylar.length > 0 && (
            <Dugme disabled={mesgul} onClick={() => islem(oylariSifirla, 'Oylar sıfırlandı.')}>
              Oyları sıfırla
            </Dugme>
          )}
        </div>
      )}

      {oylama.durum === 'bitti' && (
        <div className="mb-3 rounded-md bg-[#C9A227]/20 p-3 ring-1 ring-[#ffd84d]/60">
          {kazanan ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#ffd84d]">🏆 Kazanan</p>
              <p className="font-baslik text-lg text-white">
                {kazanan.eserBaslik} <span className="text-sm text-[#d9d2c3]">({kazanan.oy} oy)</span>
              </p>
              {beraberMi && <p className="mt-1 text-[11px] text-[#ffd84d]">Berabere! Moderatör aşağıdan kazananı seçebilir.</p>}
              {moderatorMu && (
                <div className="mt-2 space-y-2">
                  <label className="block text-[11px] text-[#d9d2c3]">
                    Etkinlik tarihi ve saati
                    <input
                      type="datetime-local"
                      value={tarih}
                      onChange={(e) => setTarih(e.target.value)}
                      className="mt-1 block w-full rounded-sm bg-white/10 px-2 py-1.5 text-sm text-white ring-1 ring-white/20"
                      style={{ colorScheme: 'dark' }}
                    />
                  </label>
                  <Dugme
                    birincil
                    disabled={mesgul || !tarih}
                    onClick={() =>
                      islem(
                        () => kazananiEtkinlikYap(kazanan, tarih, topluluk, { uid: benimUid, displayName: adim }, kazanan.oy),
                        `📅 “${kazanan.eserBaslik}” gelecek etkinlik olarak eklendi.`
                      )
                    }
                  >
                    📅 Kazananı gelecek etkinlik yap
                  </Dugme>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-white">Oylama bitti ama oy verilmedi.</p>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {sonuc.map((a) => {
          const benim = benimOyum === a.id
          return (
            <li key={a.id} className={`flex items-center gap-2 rounded-sm p-1.5 ring-1 ${benim ? 'bg-[#C9A227]/15 ring-[#C9A227]/60' : 'bg-white/5 ring-white/10'}`}>
              {a.eserPosterUrl ? (
                <img src={a.eserPosterUrl} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm bg-white/10 text-xs">🎬</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {a.eserBaslik} {a.eserYil && <span className="font-normal text-[#b9b2a3]">({a.eserYil})</span>}
                </p>
                <p className="truncate text-[10px] text-[#b9b2a3]">{a.onerenAdi} önerdi</p>
                {oylama.durum !== 'kapali' && <p className="text-[11px] font-bold text-[#ffd84d]">{a.oy} oy</p>}
              </div>
              {oylama.durum === 'acik' &&
                (benim ? (
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => islem(() => adayOyumuGeriCek(etkinlik.id, benimUid))}
                    className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white ring-1 ring-white/20"
                  >
                    ✓ Oyum · geri al
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => islem(() => adayaOyVer(etkinlik.id, benimUid, adim, a.id))}
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0b0b10]"
                    style={{ background: ALTIN }}
                  >
                    {benimOyum ? 'Oyu buraya taşı' : 'Oy ver'}
                  </button>
                ))}
              {oylama.durum === 'bitti' && moderatorMu && a.id !== oylama.kazananId && a.oy > 0 && (
                <button
                  type="button"
                  disabled={mesgul}
                  onClick={() => islem(() => durumYaz({ adayOylamasi: { durum: 'bitti', kazananId: a.id } }))}
                  className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] text-white ring-1 ring-white/20"
                >
                  🏆 Kazanan bu
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {sonuc.length === 0 && <p className="text-xs text-[#b9b2a3]">Henüz aday yok.</p>}

      <div className="mt-4">
        {ekleAcik ? (
          <YapimArama eylemEtiketi="+ Aday" onSec={adayEkle} />
        ) : (
          <button type="button" onClick={() => setEkleAcik(true)} className="w-full rounded-sm bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/20 hover:bg-white/20">
            + Aday film ekle
          </button>
        )}
      </div>
      {mesaj && <p className="mt-3 rounded-sm bg-white/10 px-3 py-2 text-xs text-white">{mesaj}</p>}
    </div>
  )
}
