import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gununKitabiGetir, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'

export default function GununKitabi() {
  const navigate = useNavigate()
  const [kitap, setKitap] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [inceleniyor, setInceleniyor] = useState(false)

  async function yenile() {
    setYukleniyor(true)
    const yeni = await gununKitabiGetir()
    setKitap(yeni)
    setYukleniyor(false)
  }

  useEffect(() => {
    yenile()
  }, [])

  async function incele() {
    if (!kitap) return
    setInceleniyor(true)
    try {
      const kaydedilen = await turkceKitaptanKaydet(kitap)
      navigate(`/kitap/${kaydedilen.id}`)
    } finally {
      setInceleniyor(false)
    }
  }

  if (yukleniyor || !kitap) return null

  return (
    <div className="mb-6 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <p className="text-[11px] uppercase tracking-widest text-gise">📖 Günün Kitabı</p>
      <p className="mt-1 font-baslik text-lg text-murekkep">{kitap.baslik}</p>
      <p className="text-sm text-kraft">
        {[kitap.yazar, kitap.yayinevi, kitap.yil, kitap.sayfaSayisi && `${kitap.sayfaSayisi} sayfa`].filter(Boolean).join(' · ')}
      </p>
      {kitap.kategori && <p className="mt-0.5 text-xs text-kraft">{kitap.kategori}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button onClick={incele} disabled={inceleniyor} className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
          {inceleniyor ? 'Açılıyor...' : 'Bu Kitabı İncele →'}
        </button>
        <button onClick={yenile} className="text-[11px] text-kraft hover:text-deniz hover:underline">
          🔄 Başka Bir Kitap Göster
        </button>
      </div>
    </div>
  )
}
