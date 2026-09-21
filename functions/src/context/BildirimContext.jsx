import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { bildirimleriGetir, bildirimiOkunduIsaretle, tumBildirimleriOkunduIsaretle } from '../utils/bildirimMerkezi.js'

const BildirimContext = createContext(null)

export function useBildirimler() {
  return useContext(BildirimContext)
}

// Nav.jsx her sayfa geçişinde yeniden render oluyor — bildirimleri ORADA
// çekmek her navigasyonda yeniden okuma demek olurdu. Bunun yerine burada,
// uygulama kökünde TEK bir yerde tutuluyor: girişte bir kez çekilir, sonra
// sadece zil tıklanınca ya da birkaç dakikada bir (gerçek zamanlı dinleyici
// DEĞİL — bkz. Blaze maliyet notları, onSnapshot burada gereksiz sürekli
// okuma demek olurdu) tazelenir.
const TAZELEME_ARALIGI_MS = 3 * 60 * 1000

export function BildirimSaglayici({ children }) {
  const { kullanici } = useAuth()
  const [bildirimler, setBildirimler] = useState([])

  const yenile = useCallback(() => {
    if (!kullanici) {
      setBildirimler([])
      return
    }
    bildirimleriGetir(kullanici.uid).then(setBildirimler)
  }, [kullanici])

  useEffect(() => {
    yenile()
    if (!kullanici) return
    const zamanlayici = setInterval(yenile, TAZELEME_ARALIGI_MS)
    return () => clearInterval(zamanlayici)
  }, [kullanici, yenile])

  async function birTaneOkunduIsaretle(id) {
    setBildirimler((onceki) => onceki.map((b) => (b.id === id ? { ...b, okunduMu: true } : b)))
    await bildirimiOkunduIsaretle(id)
  }

  async function hepsiniOkunduIsaretle() {
    const okunmamislar = bildirimler.filter((b) => !b.okunduMu).map((b) => b.id)
    if (okunmamislar.length === 0) return
    setBildirimler((onceki) => onceki.map((b) => ({ ...b, okunduMu: true })))
    await tumBildirimleriOkunduIsaretle(okunmamislar)
  }

  const okunmamisSayisi = bildirimler.filter((b) => !b.okunduMu).length

  return (
    <BildirimContext.Provider value={{ bildirimler, okunmamisSayisi, yenile, birTaneOkunduIsaretle, hepsiniOkunduIsaretle }}>
      {children}
    </BildirimContext.Provider>
  )
}
