import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

// Veri modeli:
// kullanicilar/{uid}/takipEdilenler/{hedefUid} = { tarih }
// kullanicilar/{uid}/takipciler/{takipciUid}  = { tarih }
// İki yönü de yazıyoruz ki hem "kimi takip ediyorum" hem "beni kim takip ediyor"
// sorguları tek koleksiyon okumasıyla cevaplanabilsin.

export async function takipEt(benUid, hedefUid) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'kullanicilar', benUid, 'takipEdilenler', hedefUid), { tarih: serverTimestamp() })
  batch.set(doc(db, 'kullanicilar', hedefUid, 'takipciler', benUid), { tarih: serverTimestamp() })
  await batch.commit()
}

export async function takipBirak(benUid, hedefUid) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'kullanicilar', benUid, 'takipEdilenler', hedefUid))
  batch.delete(doc(db, 'kullanicilar', hedefUid, 'takipciler', benUid))
  await batch.commit()
}
