import { Link } from 'react-router-dom'

export default function KitapIstekTanitimKarti() {
  return (
    <Link
      to="/kitap-istekleri"
      className="mb-10 flex items-center gap-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi transition hover:ring-deniz/50"
    >
      <span className="text-2xl">📖</span>
      <div>
        <p className="font-baslik text-base text-murekkep">Kitap Arıyorum</p>
        <p className="text-xs text-kraft">Elinde olmayan bir kitabı ara — kitaplığında sahibi olanlara otomatik haber gider.</p>
      </div>
    </Link>
  )
}
