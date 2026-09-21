import { Link } from 'react-router-dom'

// SonAlintilarBolumu'nun (Alıntı Duvarı önizlemesi) hemen üstünde — hem
// "Bu Alıntı Hangi Kitaptan?" oyununun ("yeterli veri bulunamadı" diyen)
// hem de genel olarak Alıntı Duvarı'nın büyümesi topluluğun katkısına bağlı
// olduğu için, katkıyı doğrudan teşvik eden küçük bir çağrı.
export default function AlintiKatkiCagrisi() {
  return (
    <Link
      to="/alintilar"
      className="mb-3 flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
    >
      <span className="text-xl">✍️</span>
      <div>
        <p className="text-sm text-murekkep">Okuduğun bir kitaptan aklında kalan bir cümle var mı?</p>
        <p className="text-xs text-kraft">Alıntı Duvarı'na ekle — hem topluluğa ilham olur hem "Bu Alıntı Hangi Kitaptan?" oyununu besler.</p>
      </div>
    </Link>
  )
}
