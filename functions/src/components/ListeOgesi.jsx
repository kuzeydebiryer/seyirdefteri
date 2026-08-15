import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ogePuanla, ogeTamamlaDegistir, ogeSil, ogeSiralariniTakasEt } from '../utils/liste.js'
import YildizPuan from './YildizPuan.jsx'

const YILDIZ_SECENEKLERI = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

function tarihGoster(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ListeOgesi({ topluluklId, listeId, oge, sirano, uyeMi, yoneticiMiyim, oncekiOge, sonrakiOge, onDegisti }) {
  const { kullanici } = useAuth()
  const [puanlar, setPuanlar] = useState(oge.puanlar || {})
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [tamamlayanlar, setTamamlayanlar] = useState(oge.tamamlayanlar || [])
  const [tamamlaIsleniyor, setTamamlaIsleniyor] = useState(false)
  const [siliniyor, setSiliniyor] = useState(false)
  const [siraIsleniyor, setSiraIsleniyor] = useState(false)

  const degerler = Object.values(puanlar)
  const ortalama = degerler.length ? degerler.reduce((a, b) => a + b, 0) / degerler.length : null
  const benimPuanim = kullanici ? puanlar[kullanici.uid] : null
  const benTamamladimMi = kullanici && tamamlayanlar.includes(kullanici.uid)
  const benimEklediğimMi = kullanici?.uid === oge.ekleyenId

  async function puanVer(e) {
    const yeniPuan = Number(e.target.value)
    if (!kullanici || !uyeMi) return
    setKaydediliyor(true)
    setPuanlar((onceki) => ({ ...onceki, [kullanici.uid]: yeniPuan }))
    try {
      await ogePuanla(oge.id, kullanici.uid, yeniPuan)
    } finally {
      setKaydediliyor(false)
    }
  }

  async function tamamlaDegistir() {
    if (!kullanici || !uyeMi) return
    setTamamlaIsleniyor(true)
    const yeni = benTamamladimMi ? tamamlayanlar.filter((u) => u !== kullanici.uid) : [...tamamlayanlar, kullanici.uid]
    setTamamlayanlar(yeni)
    try {
      await ogeTamamlaDegistir(oge.id, kullanici.uid, benTamamladimMi)
    } finally {
      setTamamlaIsleniyor(false)
    }
  }

  async function sil() {
    if (!window.confirm('Bu eseri listeden kaldırmak istediğine emin misin?')) return
    setSiliniyor(true)
    try {
      await ogeSil(oge.id, topluluklId, listeId)
      onDegisti()
    } finally {
      setSiliniyor(false)
    }
  }

  async function yukariTasi() {
    if (!oncekiOge) return
    setSiraIsleniyor(true)
    try {
      await ogeSiralariniTakasEt(oge, oncekiOge)
      onDegisti()
    } finally {
      setSiraIsleniyor(false)
    }
  }

  async function asagiTasi() {
    if (!sonrakiOge) return
    setSiraIsleniyor(true)
    try {
      await ogeSiralariniTakasEt(oge, sonrakiOge)
      onDegisti()
    } finally {
      setSiraIsleniyor(false)
    }
  }

  const esereGit = oge.tmdbId || oge.googleBooksId ? `/${oge.tur === 'kitap' ? 'kitap' : oge.tur === 'dizi' ? 'dizi' : 'film'}/${oge.tmdbId || oge.googleBooksId}` : null

  return (
    <div className={`flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi ${benTamamladimMi ? 'opacity-70' : ''}`}>
      {yoneticiMiyim && (
        <div className="flex shrink-0 flex-col text-kraft">
          <button onClick={yukariTasi} disabled={!oncekiOge || siraIsleniyor} className="disabled:opacity-20 hover:text-murekkep">
            ▲
          </button>
          <button onClick={asagiTasi} disabled={!sonrakiOge || siraIsleniyor} className="disabled:opacity-20 hover:text-murekkep">
            ▼
          </button>
        </div>
      )}

      <span className="w-6 shrink-0 text-center font-baslik text-sm text-gise">#{sirano}</span>

      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
        {oge.posterUrl && <img src={oge.posterUrl} alt={oge.baslik} className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        {esereGit ? (
          <Link to={esereGit} className="font-govde text-sm text-murekkep hover:underline">
            {oge.baslik} {oge.yil && <span className="text-kraft">({oge.yil})</span>}
          </Link>
        ) : (
          <p className="font-govde text-sm text-murekkep">
            {oge.baslik} {oge.yil && <span className="text-kraft">({oge.yil})</span>}
          </p>
        )}
        {oge.yazar && <p className="text-xs text-kraft">{oge.yazar}</p>}
        {oge.etkinlikTarihi && <p className="text-xs text-kraft">{tarihGoster(oge.etkinlikTarihi)}</p>}
        {oge.ekleyenAdi && <p className="text-[11px] text-kraft">{oge.ekleyenAdi} ekledi</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {ortalama != null ? (
            <div className="flex items-center gap-1">
              <YildizPuan puan={Math.round(ortalama * 2) / 2} boyut="text-xs" />
              <span className="text-[11px] text-kraft">({degerler.length})</span>
            </div>
          ) : (
            <span className="text-xs text-kraft">Henüz puanlanmadı</span>
          )}
          <button
            onClick={tamamlaDegistir}
            disabled={!uyeMi || tamamlaIsleniyor}
            className={`rounded-sm px-2 py-0.5 text-[11px] ring-1 ${
              benTamamladimMi ? 'bg-deniz text-kagit ring-deniz' : 'bg-kagit text-kraft ring-cizgi hover:text-murekkep'
            } disabled:opacity-40`}
          >
            {benTamamladimMi ? '✓ Tamamladım' : 'Tamamladım İşaretle'}
          </button>
          {tamamlayanlar.length > 0 && <span className="text-[11px] text-kraft">{tamamlayanlar.length} kişi tamamladı</span>}
          {(benimEklediğimMi || yoneticiMiyim) && (
            <button onClick={sil} disabled={siliniyor} className="text-[11px] text-kraft hover:text-muhur disabled:opacity-40">
              Kaldır
            </button>
          )}
        </div>
      </div>
      <select
        value={benimPuanim || ''}
        onChange={puanVer}
        disabled={!kullanici || !uyeMi || kaydediliyor}
        className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi disabled:opacity-40"
      >
        <option value="" disabled>
          Puan ver
        </option>
        {YILDIZ_SECENEKLERI.map((s) => (
          <option key={s} value={s}>
            {s} ★
          </option>
        ))}
      </select>
    </div>
  )
}
