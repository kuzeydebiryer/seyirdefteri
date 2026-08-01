import { useEffect, useState } from 'react'
import { listeOgeleriGetir } from '../utils/kisiselListe.js'

export function useKisiselListeOgeleri(listeId) {
  const [ogeler, setOgeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!listeId) return
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const liste = await listeOgeleriGetir(listeId)
      if (!iptal) {
        setOgeler(liste)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [listeId, yenile])

  return { ogeler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}
