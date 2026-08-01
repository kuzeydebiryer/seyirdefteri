import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useKisiselListeler } from '../hooks/useKisiselListeler.js'
import { listeOlustur } from '../utils/kisiselListe.js'

export default function Listelerim() {
  const { kullanici } = useAuth()
  const { listeler, yukleniyor, yenidenYukle } = useKisiselListeler(kullanici?.uid)

  const [formuAcik, setFormuAcik] = useState(false)
  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [herkeseAcik, setHerkeseAcik] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function olustur(e) {
    e.preventDefault()
    if (!baslik.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      await listeOlustur(kullanici, { baslik, aciklama, herkeseAcik })
      setBaslik('')
      setAciklama('')
      setHerkeseAcik(true)
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">Listelerim</h1>
        <button onClick={() => setFormuAcik((a) => !a)} className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit">
          {formuAcik ? 'Vazgeç' : '+ Yeni Liste'}
        </button>
      </div>
      <p className="mb-6 text-xs text-kraft">
        Film, dizi ve kitaplardan kendi temalı listelerini oluştur — "En Sevdiğim Distopyalar", "2026'da İzledklerim" gibi.
      </p>

      {formuAcik && (
        <form onSubmit={olustur} className="mb-6 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div>
            <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Başlık</label>
            <input
              type="text"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="ör. En Sevdiğim Distopya Filmleri"
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Açıklama (opsiyonel)</label>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={2}
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-kraft">
            <input type="checkbox" checked={herkeseAcik} onChange={(e) => setHerkeseAcik(e.target.checked)} />
            Herkese açık (profilinde görünür)
          </label>
          <button
            type="submit"
            disabled={kaydediliyor || !baslik.trim()}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Oluşturuluyor...' : 'Listeyi Oluştur'}
          </button>
        </form>
      )}

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && listeler.length === 0 && <p className="text-sm text-kraft">Henüz bir listen yok.</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listeler.map((l) => (
          <Link key={l.id} to={`/liste/${l.id}`} className="block">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {l.kapakUrl && <img src={l.kapakUrl} alt={l.baslik} className="h-full w-full object-cover" />}
            </div>
            <p className="mt-1 truncate text-xs font-medium text-murekkep">{l.baslik}</p>
            <p className="text-[11px] text-kraft">
              {l.ogeSayisi || 0} eser{!l.herkeseAcik && ' · Gizli'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
