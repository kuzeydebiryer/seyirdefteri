import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'

// Anasayfadaki yatay şeritlerin ("Film Tavsiyeleri", "Yeni Gelen Filmler",
// "Kitap Tavsiyeleri") "Tümünü Gör" hedefi — kendi başına, karışık başka
// bölümlerin arasına gömülmeden, tam grid + tavsiye ekleme formuyla.
export default function TavsiyelerSayfasi({ tur, koleksiyon = 'tavsiyeler', baslik, ekleButonuMetni }) {
  const { tavsiyeler, yenidenYukle } = useTavsiyeler(tur, koleksiyon)

  return (
    <div>
      <TavsiyeBolumu
        tur={tur}
        koleksiyon={koleksiyon}
        tavsiyeler={tavsiyeler}
        yenidenYukle={yenidenYukle}
        baslik={baslik}
        ekleButonuMetni={ekleButonuMetni}
      />
    </div>
  )
}
