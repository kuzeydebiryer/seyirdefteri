import { useState } from 'react'

// Tüm Sinema Oyunları'nın ortak iskeleti: bir soru diziği alır (her biri
// {gorsel?, baslik?, altYazi?, secenekler: [{etiket, dogruMu}]}), tek tek
// gösterir, skoru tutar, sonda özet gösterir. Her oyun kendi soru üretim
// mantığını yazıyor, bu bileşen sadece "soru sor → cevapla → sonraki" akışını
// standartlaştırıyor.
export default function OyunIskeleti({ sorular, sonuclandiginda, tekrarOyna }) {
  const [index, setIndex] = useState(0)
  const [skor, setSkor] = useState(0)
  const [secilenIndex, setSecilenIndex] = useState(null)
  const [bitti, setBitti] = useState(false)

  const soru = sorular[index]

  function secildi(secenekIndex) {
    if (secilenIndex !== null) return
    setSecilenIndex(secenekIndex)
    if (soru.secenekler[secenekIndex].dogruMu) setSkor((s) => s + 1)
  }

  function sonrakiSoru() {
    if (index + 1 >= sorular.length) {
      setBitti(true)
      sonuclandiginda?.(skor)
      return
    }
    setIndex((i) => i + 1)
    setSecilenIndex(null)
  }

  if (sorular.length === 0) {
    return <p className="text-sm text-kraft">Bu oyun için yeterli veri bulunamadı — biraz daha topluluk aktivitesi gerekiyor.</p>
  }

  if (bitti) {
    const yuzde = Math.round((skor / sorular.length) * 100)
    return (
      <div className="rounded-sm bg-kagitKoyu p-6 text-center ring-1 ring-cizgi">
        <p className="font-baslik text-2xl text-murekkep">
          {skor} / {sorular.length}
        </p>
        <p className="mt-1 text-sm text-kraft">
          {yuzde >= 80 ? 'Harika gidiyorsun! 🎬' : yuzde >= 50 ? 'Fena değil.' : 'Bir dahakine daha iyi olacak.'}
        </p>
        <button onClick={tekrarOyna} className="mt-4 rounded-full bg-gise px-4 py-2 font-govde text-sm text-kagit">
          Tekrar Oyna
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-kraft">
        <span>
          Soru {index + 1} / {sorular.length}
        </span>
        <span>Skor: {skor}</span>
      </div>

      {soru.gorsel && (
        <div className="mb-3 overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
          <img src={soru.gorsel} alt="" className="w-full object-cover" style={soru.gorselStil} />
        </div>
      )}

      {soru.ses && (
        <div className="mb-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <audio controls src={soru.ses} className="w-full" />
        </div>
      )}

      {soru.baslik && <h3 className="mb-1 font-baslik text-lg text-murekkep">{soru.baslik}</h3>}
      {soru.altYazi && <p className="mb-3 text-sm text-kraft leading-relaxed">{soru.altYazi}</p>}

      <div className="space-y-2">
        {soru.secenekler.map((s, i) => {
          const secildiMi = secilenIndex !== null
          const buSecildiMi = secilenIndex === i
          const renkSinifi = !secildiMi
            ? 'bg-kagitKoyu ring-cizgi hover:ring-deniz/50'
            : s.dogruMu
              ? 'bg-gise/20 ring-gise text-murekkep'
              : buSecildiMi
                ? 'bg-muhur/10 ring-muhur text-murekkep'
                : 'bg-kagitKoyu ring-cizgi opacity-50'
          return (
            <button
              key={i}
              onClick={() => secildi(i)}
              disabled={secildiMi}
              className={`block w-full rounded-sm px-3 py-2 text-left text-sm ring-1 transition ${renkSinifi}`}
            >
              {s.etiket} {secildiMi && s.dogruMu && '✓'} {secildiMi && buSecildiMi && !s.dogruMu && '✕'}
            </button>
          )
        })}
      </div>

      {secilenIndex !== null && (
        <button onClick={sonrakiSoru} className="mt-4 rounded-full bg-gise px-4 py-2 font-govde text-sm text-kagit">
          {index + 1 >= sorular.length ? 'Bitir' : 'Sonraki Soru →'}
        </button>
      )}
    </div>
  )
}
