import { doc, getDocs, collection, increment, orderBy, query, limit, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// "O mu Bu mu" oyunu — turnuva formatı: 15 tur boyunca kazanan film bir
// sonraki turda kalıyor, 15. turun sonunda ayakta kalan TEK film "bu
// oyunun galibi" oluyor. Her tur için ayrı ayrı kredi VERMİYORUZ — sadece
// 15 turu da atlatan finalist filme +1 "kazanma" yazılıyor. Bu yüzden
// "kaybetme" alanı yok — bu bir 1v1 ELO sistemi değil, "kaç oyunda
// şampiyon oldu" sayacı.
export async function turnuvaGalibiKaydet(galipFilm) {
  await setDoc(
    doc(db, 'filmTercihPuanlari', String(galipFilm.id)),
    { baslik: galipFilm.baslik, posterUrl: galipFilm.posterUrl || '', kazanma: increment(1), sonGuncelleme: serverTimestamp() },
    { merge: true }
  )
}

export async function enCokTercihEdilenleriGetir(limitSayisi = 20) {
  const snap = await getDocs(query(collection(db, 'filmTercihPuanlari'), orderBy('kazanma', 'desc'), limit(limitSayisi)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
