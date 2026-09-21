import jsPDF from 'jspdf'
import { notoSansTurkishRegularBase64 } from '../assets/fonts/NotoSansTurkishRegular.js'
import { notoSansTurkishBoldBase64 } from '../assets/fonts/NotoSansTurkishBold.js'

const MADDE_TIPI_ETIKETI = { gezilecek: 'Gezilecek Yer', 'yeme-icme': 'Yeme-İçme', ulasim: 'Ulaşım', diger: 'Diğer' }

function paraFormatla(sayi) {
  return `${Number(sayi).toLocaleString('tr-TR')} ₺`
}

function tarihFormatla(iso, saatliMi) {
  if (!iso) return ''
  const d = new Date(iso)
  return saatliMi
    ? d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function butceToplamHesapla(kisiselBilgiler = {}) {
  return Object.values(kisiselBilgiler).reduce((t, v) => t + (Number(v?.ucret) || 0), 0)
}

function kisiselBilgiSatiri(kisiselBilgiler, isimHaritasi) {
  return Object.entries(kisiselBilgiler || {})
    .map(([uid, v]) => {
      const parcalar = []
      if (v.pnr) parcalar.push(`PNR: ${v.pnr}`)
      if (v.ucret != null && v.ucret !== '') parcalar.push(paraFormatla(v.ucret))
      if (parcalar.length === 0) return null
      return `${isimHaritasi[uid] || 'İsimsiz'} — ${parcalar.join(', ')}`
    })
    .filter(Boolean)
    .join(' · ')
}

// Tarayıcıda, sunucuya hiç gitmeden bir gezi planını A4 PDF olarak indirir.
// Basit, metin tabanlı bir düzen — html2canvas gibi ekran görüntüsü almak
// yerine doğrudan jsPDF'in kendi metin/çizgi çizimleriyle, böylece dosya
// küçük kalıyor ve metin seçilebilir/aranabilir oluyor.
export function geziPlaniPdfIndir(plan, isimHaritasi) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // jsPDF'in standart (Helvetica vb.) fontları Türkçe'ye özgü ç/ğ/ı/İ/ö/ş/ü
  // karakterlerini düzgün basmıyor (WinAnsi kod sayfası bu harfleri
  // içermiyor) — bu yüzden Türkçe alt kümesine küçültülmüş bir Noto Sans
  // gömülü font kullanıyoruz.
  doc.addFileToVFS('NotoSansTurkish-Regular.ttf', notoSansTurkishRegularBase64)
  doc.addFont('NotoSansTurkish-Regular.ttf', 'NotoSansTurkish', 'normal')
  doc.addFileToVFS('NotoSansTurkish-Bold.ttf', notoSansTurkishBoldBase64)
  doc.addFont('NotoSansTurkish-Bold.ttf', 'NotoSansTurkish', 'bold')
  doc.setFont('NotoSansTurkish', 'normal')

  const solKenar = 15
  const sagKenar = 195
  let y = 20

  function satirEkle(metin, { boyut = 10, kalin = false, renk = [40, 30, 20], bosluk = 6 } = {}) {
    if (y > 280) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(boyut)
    doc.setFont('NotoSansTurkish', kalin ? 'bold' : 'normal')
    doc.setTextColor(...renk)
    const satirlar = doc.splitTextToSize(metin, sagKenar - solKenar)
    doc.text(satirlar, solKenar, y)
    y += satirlar.length * (boyut / 2.2) + bosluk
  }

  function baslikEkle(metin) {
    y += 3
    satirEkle(metin, { boyut: 13, kalin: true, renk: [140, 40, 40], bosluk: 4 })
    doc.setDrawColor(200, 190, 160)
    doc.line(solKenar, y - 2, sagKenar, y - 2)
    y += 2
  }

  // Başlık
  satirEkle(plan.baslik, { boyut: 18, kalin: true, bosluk: 2 })
  const tarihMetni = [plan.baslangicTarihi && tarihFormatla(plan.baslangicTarihi), plan.bitisTarihi && tarihFormatla(plan.bitisTarihi)]
    .filter(Boolean)
    .join(' — ')
  if (tarihMetni) satirEkle(tarihMetni, { boyut: 10, renk: [110, 100, 80] })

  const tumMaddeler = [...(plan.ucuslar || []), ...(plan.konaklamalar || []), ...(plan.gunler || []).flatMap((g) => g.maddeler || [])]
  const butceToplam = tumMaddeler.reduce((t, m) => t + butceToplamHesapla(m.kisiselBilgiler), 0)
  if (butceToplam > 0) satirEkle(`Toplam Bütçe: ${paraFormatla(butceToplam)}`, { boyut: 11, kalin: true })

  // Uçuşlar
  if ((plan.ucuslar || []).length > 0) {
    baslikEkle('UÇUŞLAR')
    plan.ucuslar.forEach((u) => {
      satirEkle(`${u.havayolu}${u.tik ? '  (Tamam)' : ''}`, { boyut: 11, kalin: true, bosluk: 1 })
      const gidisDonus = [u.gidisTarihSaat && `Gidiş: ${tarihFormatla(u.gidisTarihSaat, true)}`, u.donusTarihSaat && `Dönüş: ${tarihFormatla(u.donusTarihSaat, true)}`]
        .filter(Boolean)
        .join('   ')
      if (gidisDonus) satirEkle(gidisDonus, { boyut: 9.5, renk: [90, 80, 65], bosluk: 1 })
      const kisisel = kisiselBilgiSatiri(u.kisiselBilgiler, isimHaritasi)
      if (kisisel) satirEkle(kisisel, { boyut: 9, renk: [110, 100, 80] })
    })
  }

  // Konaklamalar
  if ((plan.konaklamalar || []).length > 0) {
    baslikEkle('KONAKLAMA')
    plan.konaklamalar.forEach((k) => {
      satirEkle(`${k.ad}${k.tik ? '  (Tamam)' : ''}`, { boyut: 11, kalin: true, bosluk: 1 })
      if (k.konum) satirEkle(k.konum, { boyut: 9.5, renk: [90, 80, 65], bosluk: 1 })
      const tarihler = [k.girisTarihi && tarihFormatla(k.girisTarihi), k.cikisTarihi && tarihFormatla(k.cikisTarihi)].filter(Boolean).join(' → ')
      if (tarihler) satirEkle(tarihler, { boyut: 9.5, renk: [90, 80, 65], bosluk: 1 })
      const kisisel = kisiselBilgiSatiri(k.kisiselBilgiler, isimHaritasi)
      if (kisisel) satirEkle(kisisel, { boyut: 9, renk: [110, 100, 80] })
    })
  }

  // Gün gün program
  if ((plan.gunler || []).length > 0) {
    baslikEkle('GÜN GÜN PROGRAM')
    plan.gunler.forEach((g) => {
      const konumEtiketi = [g.sehir, g.ulkeAdi].filter(Boolean).join(', ')
      satirEkle(`${g.baslik}${konumEtiketi ? `  (${konumEtiketi})` : ''}`, { boyut: 11.5, kalin: true, bosluk: 2 })
      ;(g.maddeler || []).forEach((m) => {
        const ikon = MADDE_TIPI_ETIKETI[m.tip] || 'Diğer'
        satirEkle(`- [${ikon}] ${m.baslik}${m.saat ? ` — ${m.saat}` : ''}${m.tik ? '  (Tamam)' : ''}`, { boyut: 10, bosluk: 1 })
        if (m.konum) satirEkle(`   ${m.konum}`, { boyut: 9, renk: [90, 80, 65], bosluk: 1 })
        if (m.not) satirEkle(`   ${m.not}`, { boyut: 9, renk: [90, 80, 65], bosluk: 1 })
        const kisisel = kisiselBilgiSatiri(m.kisiselBilgiler, isimHaritasi)
        if (kisisel) satirEkle(`   ${kisisel}`, { boyut: 9, renk: [110, 100, 80] })
      })
      y += 2
    })
  }

  doc.save(`${plan.baslik.replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'gezi-plani'}.pdf`)
}
