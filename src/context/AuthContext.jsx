import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthSaglayici({ children }) {
  const [kullanici, setKullanici] = useState(null) // Firebase Auth kullanıcısı
  const [profil, setProfil] = useState(null) // kullanicilar/{uid} dokümanı
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    const kaldir = onAuthStateChanged(auth, async (u) => {
      setKullanici(u)
      if (u) {
        const snap = await getDoc(doc(db, 'kullanicilar', u.uid))
        setProfil(snap.exists() ? { id: u.uid, ...snap.data() } : null)
      } else {
        setProfil(null)
      }
      setYukleniyor(false)
    })
    return kaldir
  }, [])

  // "Bugün aktif olanlar" için son görülme damgası — her eylemde değil,
  // 15 dakikada bir güncelleniyor (throttle). Maliyet önemsiz: küçük bir
  // topluluk için günde birkaç yüz yazma, ücretsiz Firestore kotasının
  // (günlük 20.000 yazma) kırıntısı bile değil.
  useEffect(() => {
    if (!kullanici) return
    const SON_GORULME_ARALIGI_MS = 15 * 60 * 1000
    const localAnahtar = `sonGorulmeGuncelleme_${kullanici.uid}`

    function guncellemeGerekiyorMu() {
      const sonGuncelleme = Number(localStorage.getItem(localAnahtar) || 0)
      return Date.now() - sonGuncelleme > SON_GORULME_ARALIGI_MS
    }

    function sonGorulmeyiGuncelle() {
      if (!guncellemeGerekiyorMu()) return
      localStorage.setItem(localAnahtar, String(Date.now()))
      updateDoc(doc(db, 'kullanicilar', kullanici.uid), { sonGorulme: serverTimestamp() }).catch(() => {})
    }

    sonGorulmeyiGuncelle() // sayfa açılışında bir kez
    const zamanlayici = setInterval(sonGorulmeyiGuncelle, SON_GORULME_ARALIGI_MS)
    return () => clearInterval(zamanlayici)
  }, [kullanici])

  async function girisYap(eposta, sifre) {
    await signInWithEmailAndPassword(auth, eposta, sifre)
  }

  async function cikisYap() {
    await signOut(auth)
  }

  // Davet kodu ile kayıt olma akışı.
  // Not: Firebase Auth hesabı oluşturma ile Firestore'daki kod tüketimi iki ayrı
  // adım olduğu için teorik olarak çok nadir bir yarış durumu (aynı kodun aynı anda
  // iki kişi tarafından kullanılması) mümkün — 5-50 kişilik kapalı bir toplulukta
  // pratikte sorun yaratmaz, ileride Cloud Function ile tam atomik hale getirilebilir.
  async function kayitOl({ eposta, sifre, adSoyad, kullaniciAdi, davetKodu }) {
    const kodRef = doc(db, 'davetKodlari', davetKodu.trim().toUpperCase())
    const kodSnap = await getDoc(kodRef)
    if (!kodSnap.exists()) throw new Error('Davet kodu bulunamadı.')
    if (kodSnap.data().kullanildiMi) throw new Error('Bu davet kodu zaten kullanılmış.')

    const cred = await createUserWithEmailAndPassword(auth, eposta, sifre)
    await updateProfile(cred.user, { displayName: adSoyad })

    await runTransaction(db, async (tx) => {
      const guncelKodSnap = await tx.get(kodRef)
      if (!guncelKodSnap.exists() || guncelKodSnap.data().kullanildiMi) {
        throw new Error('Bu davet kodu az önce başka biri tarafından kullanıldı.')
      }
      tx.update(kodRef, {
        kullanildiMi: true,
        kullananId: cred.user.uid,
        kullanilmaTarihi: serverTimestamp(),
      })
      tx.set(doc(db, 'kullanicilar', cred.user.uid), {
        adSoyad,
        kullaniciAdi,
        bio: '',
        avatarUrl: '',
        davetEden: guncelKodSnap.data().olusturanId || null,
        kalanDavetHakki: 3,
        olusturmaTarihi: serverTimestamp(),
      })
    })

    const yeniProfilSnap = await getDoc(doc(db, 'kullanicilar', cred.user.uid))
    setProfil({ id: cred.user.uid, ...yeniProfilSnap.data() })
  }

  // Kendi profilini günceller (bio, avatarUrl vb.) ve context'teki profili tazeler
  // ki üst menüdeki avatar/isim sayfa yenilenmeden hemen güncellensin.
  async function profilGuncelle(alanlar) {
    if (!kullanici) return
    await updateDoc(doc(db, 'kullanicilar', kullanici.uid), alanlar)
    setProfil((onceki) => ({ ...onceki, ...alanlar }))
  }

  const deger = { kullanici, profil, yukleniyor, girisYap, cikisYap, kayitOl, profilGuncelle }

  return <AuthContext.Provider value={deger}>{children}</AuthContext.Provider>
}
