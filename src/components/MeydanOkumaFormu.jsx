import { useState } from 'react'
import EserSecici from './EserSecici.jsx'

const MEDYA_TURU_ETIKETI = { sinema: 'Film', dizi: 'Dizi', kitap: 'Kitap' }
const TUR_KATEGORI_ETIKETI = { sinema: 'Film', dizi: 'Dizi', kitap: 'Kitap' }

// Meydan Okuma oluşturma formu — üç farklı tür arasında geçiş yapan sekmeli
// bir yapı. Her tür kendi alanlarını topluyor, dışarıya tek, normalize
// edilmiş bir "veri" objesi veriyor (meydanOkumaOlustur'a doğrudan geçilebilir).
export default function MeydanOkumaFormu({ onOlustur, onVazgec }) {
  const [tur, setTur] = useState('sayisal')
  const [baslik, setBaslik] = useState('')
  const [baslangicTarihi, setBaslangicTarihi] = useState(new Date().toISOString().slice(0, 10))
  const [bitisTarihi, setBitisTarihi] = useState('')
  const [herkeseAcik, setHerkeseAcik] = useState(false)

  // sayısal
  const [medyaTuru, setMedyaTuru] = useState('sinema')
  const [hedefSayiSayisal, setHedefSayiSayisal] = useState('')

  // eser
  const [eserTuru, setEserTuru] = useState('sinema')
  const [iliskili, setIliskili] = useState(null)

  // ritüel
  const [girisTipi, setGirisTipi] = useState('evet_hayir')
  const [birim, setBirim] = useState('sayfa')
  const [hedefSayiRituel, setHedefSayiRituel] = useState('')

  const [gonderiliyor, setGonderiliyor] = useState(false)

  function gonder(e) {
    e.preventDefault()
    if (!baslik.trim() || !bitisTarihi) return
    if (tur === 'eser' && !iliskili) return

    const ortak = { baslik: baslik.trim(), tur, baslangicTarihi, bitisTarihi, herkeseAcik }

    let veri
    if (tur === 'sayisal') {
      if (!hedefSayiSayisal) return
      veri = { ...ortak, medyaTuru, hedefSayi: Number(hedefSayiSayisal) }
    } else if (tur === 'eser') {
      veri = {
        ...ortak,
        iliskiliTur: iliskili.tur,
        iliskiliDisId: iliskili.disId,
        iliskiliBaslik: iliskili.baslik,
        iliskiliPosterUrl: iliskili.posterUrl,
        iliskiliYil: iliskili.yil,
      }
    } else {
      if (girisTipi === 'sayi' && !hedefSayiRituel) return
      veri = {
        ...ortak,
        girisTipi,
        birim: girisTipi === 'sayi' ? birim.trim() || 'birim' : '',
        hedefSayi: girisTipi === 'sayi' ? Number(hedefSayiRituel) : null,
      }
    }

    setGonderiliyor(true)
    Promise.resolve(onOlustur(veri)).finally(() => setGonderiliyor(false))
  }

  return (
    <form onSubmit={gonder} className="mb-6 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="flex flex-wrap gap-2">
        {[
          { deger: 'sayisal', etiket: '🔢 Sayısal Hedef' },
          { deger: 'eser', etiket: '🎯 Belirli Eser' },
          { deger: 'rituel', etiket: '🔁 Ritüel' },
        ].map((t) => (
          <button
            key={t.deger}
            type="button"
            onClick={() => setTur(t.deger)}
            className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
              tur === t.deger ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi'
            }`}
          >
            {t.etiket}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-[11px] text-kraft">Başlık</label>
        <input
          type="text"
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          placeholder={
            tur === 'sayisal' ? 'örn. Yaz Sinema Maratonu' : tur === 'eser' ? 'örn. Sonunda Bitirecem' : 'örn. Sigara Bırakma'
          }
          required
          className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
      </div>

      {tur === 'sayisal' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Ne izleyeceksin/okuyacaksın?</label>
            <select value={medyaTuru} onChange={(e) => setMedyaTuru(e.target.value)} className="w-full rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi">
              <option value="sinema">Film</option>
              <option value="dizi">Dizi</option>
              <option value="kitap">Kitap</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Kaç tane?</label>
            <input
              type="number"
              min="1"
              value={hedefSayiSayisal}
              onChange={(e) => setHedefSayiSayisal(e.target.value)}
              placeholder="örn. 10"
              required
              className="w-full rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <p className="col-span-2 text-[11px] text-kraft">
            İlerleme otomatik hesaplanır — bu süre içinde {MEDYA_TURU_ETIKETI[medyaTuru].toLowerCase()} puanladıkça/bitirdikçe sayaç kendiliğinden artar.
          </p>
        </div>
      )}

      {tur === 'eser' && (
        <div>
          <label className="mb-1 block text-[11px] text-kraft">Hangi eseri bitireceksin?</label>
          {!iliskili && (
            <div className="mb-2 flex gap-1.5">
              {Object.entries(TUR_KATEGORI_ETIKETI).map(([deger, etiket]) => (
                <button
                  key={deger}
                  type="button"
                  onClick={() => setEserTuru(deger)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-govde ring-1 ${
                    eserTuru === deger ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi'
                  }`}
                >
                  {etiket}
                </button>
              ))}
            </div>
          )}
          <EserSecici kategori={TUR_KATEGORI_ETIKETI[eserTuru]} secili={iliskili} onSecim={setIliskili} onTemizle={() => setIliskili(null)} />
        </div>
      )}

      {tur === 'rituel' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGirisTipi('evet_hayir')}
              className={`flex-1 rounded-sm px-2 py-1.5 text-xs ring-1 ${girisTipi === 'evet_hayir' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi'}`}
            >
              Evet / Hayır (yaptım mı?)
            </button>
            <button
              type="button"
              onClick={() => setGirisTipi('sayi')}
              className={`flex-1 rounded-sm px-2 py-1.5 text-xs ring-1 ${girisTipi === 'sayi' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi'}`}
            >
              Sayısal (örn. günde X sayfa)
            </button>
          </div>
          {girisTipi === 'sayi' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={birim}
                onChange={(e) => setBirim(e.target.value)}
                placeholder="Birim (örn. sayfa)"
                className="rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <input
                type="number"
                min="1"
                value={hedefSayiRituel}
                onChange={(e) => setHedefSayiRituel(e.target.value)}
                placeholder="Toplam hedef (örn. 3000)"
                required
                className="rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
          )}
          <p className="text-[11px] text-kraft">
            Her gün bir "bugün yaptım" işareti bırakacaksın — bir gün atlarsan sayaç sıfırlanmaz, toplam yüzden düşer sadece.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-kraft">Başlangıç</label>
          <input
            type="date"
            value={baslangicTarihi}
            onChange={(e) => setBaslangicTarihi(e.target.value)}
            className="w-full rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-kraft">Bitiş (hedef tarih)</label>
          <input
            type="date"
            value={bitisTarihi}
            onChange={(e) => setBitisTarihi(e.target.value)}
            required
            className="w-full rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-kraft">
        <input type="checkbox" checked={herkeseAcik} onChange={(e) => setHerkeseAcik(e.target.checked)} className="h-4 w-4 accent-muhur" />
        Profilimde herkese açık göster
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={gonderiliyor} className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
          {gonderiliyor ? 'Oluşturuluyor...' : 'Meydan Okumayı Başlat'}
        </button>
        <button type="button" onClick={onVazgec} className="text-xs text-kraft hover:text-murekkep">
          Vazgeç
        </button>
      </div>
    </form>
  )
}
