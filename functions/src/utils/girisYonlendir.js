// Film/dizi/kitap/kişi/profil sayfaları artık giriş yapmadan da görülebiliyor
// (bkz. App.jsx — OzelRota kaldırıldı) — ama puanlama, favori, takip gibi
// eylemler yine üyelik istiyor. Önceden bu fonksiyonlar "kullanici yoksa
// sessizce hiçbir şey yapma" diye yazılmıştı (OzelRota zaten girişi garanti
// ettiği için); artık giriş yapmamış bir ziyaretçi bu butona basabildiği
// için, sessiz no-op yerine onu girişe yönlendirip, giriş yaptıktan sonra
// AYNI sayfaya geri döndürüyoruz (GirisYap.jsx ?donus= parametresini okuyor).
export function girisGerekiyorsaYonlendir(kullanici, navigate) {
  if (kullanici) return false
  navigate(`/giris?donus=${encodeURIComponent(window.location.pathname + window.location.search)}`)
  return true
}
