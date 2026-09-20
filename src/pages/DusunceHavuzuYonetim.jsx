import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { tumHavuzuGetir, konuSil, gununKonusuGetir, konuSecVeYayinla, gecmisiSifirla, GUN_SECENEKLERI } from '../utils/dusunceHavuzu.js'

// Bu sayfa herkese açık (route seviyesinde giriş kontrolü OzelRota ile
// zaten var) ama İÇERİĞİ sadece profil.yonetici === true olan hesaplara
// gösteriliyor — asıl güvenlik Firestore kuralında (create/delete işlemleri
// orada da aynı kontrolü yapıyor), burası sadece arayüz tarafı.
export default function DusunceHavuzuYonetim() {
  const { profil, kullanici } = useAuth()
  const [konular, setKonular] = useState(null)
  const [silinenId, setSilinenId] = useState(null)
  const [aktifKonu, setAktifKonu] = useState(undefined) // undefined = yükleniyor, null = hiç yayınlanmamış
  const [gunSayisi, setGunSayisi] = useState(5)
  const [secimYapiliyorId, setSecimYapiliyorId] = useState(null)
  const [ozelKonuMetni, setOzelKonuMetni] = useState('')
  const [ozelYayinlaniyor, setOzelYayinlaniyor] = useState(false)
  const [sifirlaniyor, setSifirlaniyor] = useState(false)

  useEffect(() => {
    if (profil?.yonetici) {
      tumHavuzuGetir().then(setKonular)
      gununKonusuGetir().then(setAktifKonu)
    }
  }, [profil?.yonetici])

  async function konuSecTiklandi(konu) {
    if (!window.confirm(`"${konu.konu}" konusu ${gunSayisi} gün boyunca Bugünün Düşüncesi olarak yayınlansın mı?`)) return
    setSecimYapiliyorId(konu.id)
    try {
      await konuSecVeYayinla({ konu: konu.konu, konuId: konu.id, gunSayisi }, kullanici)
      gununKonusuGetir().then(setAktifKonu)
    } finally {
      setSecimYapiliyorId(null)
    }
  }

  async function ozelKonuYayinla(e) {
    e.preventDefault()
    if (!ozelKonuMetni.trim()) return
    if (!window.confirm(`Bu özel konu ${gunSayisi} gün boyunca Bugünün Düşüncesi olarak yayınlansın mı?`)) return
    setOzelYayinlaniyor(true)
    try {
      await konuSecVeYayinla({ konu: ozelKonuMetni, konuId: null, gunSayisi }, kullanici)
      setOzelKonuMetni('')
      gununKonusuGetir().then(setAktifKonu)
    } finally {
      setOzelYayinlaniyor(false)
    }
  }

  async function gecmisiSifirlaTiklandi() {
    if (
      !window.confirm(
        'Geçmiş Konular listesindeki TÜM kayıtlar (şu an yayında olan dahil) kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?'
      )
    )
      return
    setSifirlaniyor(true)
    try {
      const sonuc = await gecmisiSifirla()
      setAktifKonu(null)
      window.alert(`${sonuc.silinen} kayıt silindi. Geçmiş Konular sıfırlandı.`)
    } finally {
      setSifirlaniyor(false)
    }
  }

  async function silTiklandi(konu) {
    if (!window.confirm(`Bu konuyu havuzdan kalıcı olarak silmek istediğine emin misin?\n\n"${konu.konu}"`)) return
    setSilinenId(konu.id)
    try {
      await konuSil(konu.id)
      setKonular((liste) => liste.filter((k) => k.id !== konu.id))
    } finally {
      setSilinenId(null)
    }
  }

  if (!profil) return null

  if (!profil.yonetici) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm text-kraft">Bu sayfa sadece yöneticiye açık.</p>
        <Link to="/" className="mt-2 inline-block text-xs text-deniz hover:underline">
          ← Anasayfa
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/" className="text-xs text-kraft hover:text-deniz">
        ← Anasayfa
      </Link>
      <h1 className="mt-1 font-baslik text-2xl text-murekkep mb-1">🛠 Düşünce Havuzu Yönetimi</h1>
      <p className="mb-6 text-sm text-kraft">
        Konular artık periyodik olarak değil, senin seçimlerinle yayınlanıyor. Aşağıdan bir konu seç (ya da özel bir konu yaz),
        kaç gün yayında kalacağını belirle.
      </p>

      <div className="mb-6 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
        <p className="mb-2 text-xs uppercase tracking-widest text-gise">Şu An Yayında</p>
        {aktifKonu === undefined && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {aktifKonu === null && <p className="text-sm text-kraft">Henüz hiç konu yayınlanmadı.</p>}
        {aktifKonu && (
          <>
            <p className="font-baslik text-lg leading-snug text-murekkep">{aktifKonu.konu}</p>
            <p className="mt-1 text-xs text-kraft">
              {aktifKonu.baslangicTarihi} → {aktifKonu.bitisTarihi} ({aktifKonu.gunSayisi} gün)
              {aktifKonu.suresiDoldu && <span className="ml-2 text-muhur">— süresi doldu, yeni bir konu seçebilirsin</span>}
            </p>
          </>
        )}

        <div className="mt-4 border-t border-cizgi pt-3">
          <p className="mb-1.5 text-xs text-kraft">Yeni konu kaç gün yayında kalsın?</p>
          <div className="flex flex-wrap gap-2">
            {GUN_SECENEKLERI.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGunSayisi(g)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  gunSayisi === g ? 'bg-gise text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi hover:text-deniz'
                }`}
              >
                {g} gün
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={ozelKonuYayinla} className="mt-3 flex flex-wrap gap-2 border-t border-cizgi pt-3">
          <input
            value={ozelKonuMetni}
            onChange={(e) => setOzelKonuMetni(e.target.value)}
            placeholder="Havuzda olmayan özel bir konu yaz..."
            className="min-w-0 flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button
            type="submit"
            disabled={ozelYayinlaniyor || !ozelKonuMetni.trim()}
            className="shrink-0 rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {ozelYayinlaniyor ? '...' : `Özel Konuyu Yayınla (${gunSayisi} gün)`}
          </button>
        </form>
      </div>

      <p className="mb-3 text-sm text-kraft">
        Havuzdaki tüm konular — {konular?.length ?? '…'} tanesi. Bir konuyu yayına almak için "Yayınla", uygunsuz/hatalı bir
        konuyu havuzdan kaldırmak için "Sil" kullan.
      </p>

      {konular === null && <p className="text-sm text-kraft">Yükleniyor...</p>}

      <ul className="space-y-2">
        {konular?.map((k) => (
          <li key={k.id} className="flex items-start justify-between gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-murekkep">{k.konu}</p>
              <p className="mt-1 text-[11px] text-kraft">
                {k.kaynak === 'topluluk' ? '👤 Topluluk önerisi' : k.kaynak === 'dalga2' ? '🎭 İkinci dalga' : '🌱 Başlangıç havuzu'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => konuSecTiklandi(k)}
                disabled={secimYapiliyorId === k.id}
                className="rounded-sm bg-gise px-2 py-1 text-xs text-kagit disabled:opacity-40"
              >
                {secimYapiliyorId === k.id ? '...' : `Yayınla (${gunSayisi}g)`}
              </button>
              <button
                onClick={() => silTiklandi(k)}
                disabled={silinenId === k.id}
                className="rounded-sm bg-kagit px-2 py-1 text-xs text-kraft ring-1 ring-cizgi hover:text-muhur disabled:opacity-40"
              >
                {silinenId === k.id ? '...' : 'Sil'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t border-cizgi pt-4">
        <p className="mb-2 text-xs text-kraft">Tehlikeli işlem — geri alınamaz.</p>
        <button
          onClick={gecmisiSifirlaTiklandi}
          disabled={sifirlaniyor}
          className="rounded-sm bg-kagit px-3 py-1.5 text-xs text-muhur ring-1 ring-muhur disabled:opacity-40"
        >
          {sifirlaniyor ? 'Sıfırlanıyor...' : '🗑 Geçmiş Konuları Sıfırla'}
        </button>
      </div>
    </div>
  )
}
