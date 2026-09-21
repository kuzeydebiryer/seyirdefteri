import { useRef, useState } from 'react'
import { gorselYukle } from '../utils/gorselYukle.js'
import { useAuth } from '../context/AuthContext.jsx'

// URL yapıştırma alanlarına (avatar/kapak/gönderi içi görsel) alternatif
// olarak cihazdan dosya seçip yükleme düğmesi. Yükleme bitince onYuklendi(url)
// çağrılıyor — çağıran taraf bu URL'yi tıpkı elle yapıştırılmış bir URL
// gibi kullanıyor, böylece geri kalan kod (Firestore'a kayıt, gösterim)
// hiç değişmiyor.
export default function GorselYukleButonu({ klasor, onYuklendi, etiket = '📷 Cihazdan Yükle', sinif = '' }) {
  const { kullanici } = useAuth()
  const inputRef = useRef(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')

  async function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = '' // aynı dosyayı art arda seçebilsin diye input'u sıfırla
    if (!dosya || !kullanici) return
    setYukleniyor(true)
    setHata('')
    try {
      const url = await gorselYukle(dosya, { klasor, uid: kullanici.uid })
      onYuklendi(url)
    } catch (err) {
      setHata(err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={dosyaSecildi} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={yukleniyor}
        className={sinif || 'rounded-sm bg-kagitKoyu px-3 py-1.5 text-xs text-murekkep ring-1 ring-cizgi disabled:opacity-40'}
      >
        {yukleniyor ? 'Yükleniyor...' : etiket}
      </button>
      {hata && <p className="mt-1 text-[11px] text-muhur">{hata}</p>}
    </div>
  )
}
