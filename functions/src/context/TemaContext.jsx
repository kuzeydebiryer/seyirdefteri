import { createContext, useContext, useEffect, useState } from 'react'

const TemaContext = createContext(null)

export function useTema() {
  return useContext(TemaContext)
}

function baslangicTemasi() {
  const kayitli = localStorage.getItem('tema')
  if (kayitli === 'koyu' || kayitli === 'acik') return kayitli
  // Kayıtlı tercih yoksa işletim sistemi/tarayıcı tercihine bak
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'koyu' : 'acik'
}

// index.html'deki satır içi script sayfa boyanmadan ÖNCE aynı mantıkla
// <html> öğesine "dark" sınıfını ekliyor (flaş/titreme olmasın diye) —
// burası state'i o başlangıç durumuyla senkron başlatıp yönetiyor.
export function TemaSaglayici({ children }) {
  const [tema, setTema] = useState(baslangicTemasi)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'koyu')
    localStorage.setItem('tema', tema)
  }, [tema])

  function temaDegistir() {
    setTema((t) => (t === 'koyu' ? 'acik' : 'koyu'))
  }

  return <TemaContext.Provider value={{ tema, temaDegistir }}>{children}</TemaContext.Provider>
}
