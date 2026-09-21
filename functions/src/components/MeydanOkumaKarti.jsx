import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { meydanOkumaIlerlemesiHesapla, ritualCheckinYap, kalanGunHesapla, meydanOkumaSil } from '../utils/meydanOkuma.js'

const TUR_IKONU = { sayisal: '🔢', eser: '🎯', rituel: '🔁' }

function esereLink(tur, disId) {
  if (tur === 'sinema') return `/film/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  if (tur === 'kitap') return `/kitap/${disId}`
  return '#'
}

export default function MeydanOkumaKarti({ mo, uid, sahibiMiyim, onSil }) {
  const [ilerleme, setIlerleme] = useState(null)
  const [checkinIsleniyor, setCheckinIsleniyor] = useState(false)
  const [sayiTaslak, setSayiTaslak] = useState('')

  const bugunISO = new Date().toISOString().slice(0, 10)
  const bugunYapildiMi = mo.tur === 'rituel' ? mo.gunlukKayitlar?.[bugunISO] : undefined

  useEffect(() => {
    meydanOkumaIlerlemesiHesapla(mo, uid).then(setIlerleme)
  }, [mo, uid])

  const kalanGun = kalanGunHesapla(mo.bitisTarihi)
  const yuzde = ilerleme && ilerleme.hedef > 0 ? Math.min(100, Math.round((ilerleme.yapilan / ilerleme.hedef) * 100)) : 0
  const tamamlandiMi = ilerleme && ilerleme.yapilan >= ilerleme.hedef
  const suresiGectiMi = !tamamlandiMi && kalanGun < 0

  async function checkinTiklandi(deger) {
    setCheckinIsleniyor(true)
    try {
      await ritualCheckinYap(mo.id, bugunISO, deger)
      const guncelKayitlar = { ...(mo.gunlukKayitlar || {}), [bugunISO]: deger }
      const guncelIlerleme = await meydanOkumaIlerlemesiHesapla({ ...mo, gunlukKayitlar: guncelKayitlar }, uid)
      setIlerleme(guncelIlerleme)
      mo.gunlukKayitlar = guncelKayitlar // yerel referansı da güncelle, sonraki render'da tutarlı kalsın
    } finally {
      setCheckinIsleniyor(false)
    }
  }

  async function silTiklandi() {
    if (!window.confirm('Bu meydan okumayı silmek istediğine emin misin?')) return
    await meydanOkumaSil(mo.id)
    onSil?.(mo.id)
  }

  return (
    <div className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-baslik text-base text-murekkep">
            {TUR_IKONU[mo.tur]} {mo.baslik}
          </p>
          {mo.tur === 'eser' && (
            <Link to={esereLink(mo.iliskiliTur, mo.iliskiliDisId)} className="mt-0.5 inline-flex items-center gap-1 text-xs text-deniz hover:underline">
              {mo.iliskiliBaslik}
              {mo.iliskiliYil && ` (${mo.iliskiliYil})`}
            </Link>
          )}
        </div>
        {sahibiMiyim && (
          <button onClick={silTiklandi} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
            Sil
          </button>
        )}
      </div>

      {ilerleme && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-kagit ring-1 ring-cizgi">
            <div
              className={`h-full transition-all ${tamamlandiMi ? 'bg-deniz' : suresiGectiMi ? 'bg-muhur' : 'bg-gise'}`}
              style={{ width: `${yuzde}%` }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-kraft">
            <span>
              {mo.tur === 'eser'
                ? tamamlandiMi
                  ? '✓ Tamamlandı'
                  : 'Henüz tamamlanmadı'
                : `${ilerleme.yapilan}/${ilerleme.hedef}${mo.tur === 'rituel' && mo.girisTipi === 'sayi' ? ` ${mo.birim}` : mo.tur === 'rituel' ? ' gün' : ''} (%${yuzde})`}
            </span>
            <span className={suresiGectiMi ? 'text-muhur' : ''}>
              {tamamlandiMi ? '🎉 Başarılı!' : suresiGectiMi ? 'Süre doldu' : kalanGun === 0 ? 'Bugün son gün' : `${kalanGun} gün kaldı`}
            </span>
          </div>
        </div>
      )}

      {mo.tur === 'rituel' && sahibiMiyim && !suresiGectiMi && !tamamlandiMi && (
        <div className="mt-3 border-t border-cizgi pt-3">
          {mo.girisTipi === 'evet_hayir' ? (
            <button
              onClick={() => checkinTiklandi(!bugunYapildiMi)}
              disabled={checkinIsleniyor}
              className={`w-full rounded-sm px-3 py-1.5 text-xs font-govde disabled:opacity-40 ${
                bugunYapildiMi ? 'bg-deniz text-kagit' : 'bg-kagit text-murekkep ring-1 ring-cizgi'
              }`}
            >
              {bugunYapildiMi ? '✓ Bugün yapıldı' : 'Bugün yaptım ✓'}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={sayiTaslak}
                onChange={(e) => setSayiTaslak(e.target.value)}
                placeholder={`Bugün kaç ${mo.birim}?`}
                aria-label={`Bugün kaç ${mo.birim}`}
                className="flex-1 rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <button
                onClick={() => {
                  if (!sayiTaslak) return
                  checkinTiklandi(Number(sayiTaslak))
                  setSayiTaslak('')
                }}
                disabled={checkinIsleniyor || !sayiTaslak}
                className="rounded-sm bg-muhur px-3 py-1.5 text-xs font-govde text-kagit disabled:opacity-40"
              >
                Kaydet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
