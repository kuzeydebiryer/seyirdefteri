import { useEffect, useState } from 'react'
import { kullaniciListeleriGetir } from '../utils/kisiselListe.js'

export function useKisiselListeler(uid) {
  const [listeler, setListeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!uid) {
      setListeler([])
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const liste = await kullaniciListeleriGetir(uid)
      if (!iptal) {
        setListeler(liste)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [uid, yenile])

  return { listeler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}
