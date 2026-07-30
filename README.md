# Seyirdefteri — Faz 1

Kültür-sanat günlüğü sosyal platformu. Faz 1 kapsamı: davet kodlu üyelik,
profil, sinema kategorisinde günce paylaşma, beğeni ve yorum. Herkes herkesi
görebiliyor (takip sistemi yok — Faz 2'de eklenecek).

## Tasarım
- **Palet:** Kağıt kremi (#F5EFE1), mürekkep koyu yeşili (#1F2421), mühür kırmızısı (#B33A3A), kraft tonu (#8C8368)
- **Tipografi:** Fraunces (başlıklar, edebi/dergi hissi), Newsreader (gövde metin)
- **İmza öğe:** Defter çizgisi bölüm ayırıcı, gönderi kartlarında sol kenarda ince mühür kırmızısı şerit

## Veri modeli (Firestore)
```
kullanicilar/{uid}
  adSoyad, kullaniciAdi, bio, avatarUrl, davetEden, kalanDavetHakki, olusturmaTarihi

davetKodlari/{kod}          (kod: 8 haneli, örn. "K7M2XQ9P")
  olusturanId, kullanildiMi, kullananId, olusturmaTarihi

gonderiler/{id}
  tur: "sinema"              (Faz 2'de "kitap", "gezi", "etkinlik" eklenecek)
  yazarId, yazarAdi, yazarKullaniciAdi
  baslik, yil, posterUrl
  kullaniciPuani (0.5-5), gunce (serbest metin)
  tarih, begenenler: [uid,...], yorumSayisi

gonderiler/{id}/yorumlar/{yorumId}
  yazarId, yazarAdi, metin, tarih
```

## Kurulum
```bash
npm install
cp .env.example .env   # Firebase + TMDB bilgilerini doldur
npm run dev
```

### Firebase kurulumu
1. Firebase Console'da yeni proje oluştur (veya mevcut `filmokur` projesini kullanmak
   istersen dikkat: aynı Firestore veritabanını sinema kulübü projesiyle paylaşmak
   koleksiyon isimleri çakışmadığı için teknik olarak mümkün, ama karışıklığı önlemek
   için **ayrı bir Firebase projesi** açman önerilir).
2. Firestore Database'i etkinleştir.
3. **Authentication** sekmesine git, **Sign-in method** altında **Email/Password**'ü etkinleştir
   (varsayılan olarak kapalı gelir, bu adımı atlarsan kayıt/giriş çalışmaz).
4. Project Settings > Your apps'ten web app config'ini al, `.env`'e yaz.
5. `firestore.rules` içeriğini Firebase Console > Firestore > Rules'a yapıştır, Publish.

### İlk davet kodu (çok önemli — sistemi başlatmak için gerekli)
İlk üye kaydolabilmek için ortada en az bir davet kodu olması lazım, ama daveti
verecek ilk kullanıcı henüz yok. Bu yüzden **ilk kodu Firebase Console'dan elle**
oluşturman gerekiyor:

1. Firestore Database > Data > **Start collection**
2. Collection ID: `davetKodlari`
3. Document ID: örneğin `ILKKOD01` (istediğin bir kod, büyük harf)
4. Alanlar:
   - `olusturanId` (string): `sistem`
   - `kullanildiMi` (boolean): `false`
5. Save.

Bu kodla ilk hesabını (kendini) `/kayit` sayfasından oluştur. Sonra profilinden
yeni davet kodları üretip arkadaşlarına dağıtabilirsin (her üyenin 3 hakkı var).

### TMDB
Sinema kulübü projesinde kullandığın TMDB API anahtarını aynen kullanabilirsin —
`.env` dosyasına `VITE_TMDB_API_KEY` olarak ekle.

## Faz 2'de eklenenler
- **Takip sistemi:** `kullanicilar/{uid}/takipEdilenler` ve `kullanicilar/{uid}/takipciler` alt koleksiyonları
- **Kişiselleştirilmiş akış:** Ana sayfada "Takip Ettiklerim" / "Herkes" sekmeleri
- **Kitap kategorisi:** Günce Ekle sayfasında Sinema/Kitap seçici, kitaplar için Google Books API ile otomatik kapak/yazar bilgisi

## Cilalama turu (bu sürümde eklenenler)
- **Zengin TMDB verisi:** Film seçince özet, tür(ler), süre, yönetmen, oyuncular (ilk 5), TMDB puanı otomatik geliyor
- **Zengin Google Books verisi:** Kitap seçince özet, tür(ler), sayfa sayısı, yayınevi, yayın yılı, Google puanı otomatik geliyor
- **Profil düzenleme:** Kendi profilinde "Profili Düzenle" ile bio ve avatar (görsel URL'i) değiştirilebiliyor
- **Avatar:** Görsel URL yoksa isim baş harfinden otomatik rozet üretiliyor (Nav, gönderi kartları, profil, keşfet listesinde)
- **Gönderi silme:** Kendi güncende "Sil" butonu var
- **Keşfet / kullanıcı arama:** `/kullanicilar` sayfasında kullanıcı adına göre arama + doğrudan takip et butonu

### Not: Avatar denormalizasyonu
Gönderi kartlarında yazarın avatarı, gönderi oluşturulduğu andaki `profil.avatarUrl`
değeriyle kaydediliyor (`yazarAvatarUrl` alanı). Yani profilini sonradan
değiştirirsen, geçmiş güncelerindeki avatar eski haliyle kalır — bu bilinçli bir
performans tercihi (her gönderi kartı için ayrı profil sorgusu yapmamak adına).

## Film / Dizi ayrımı ve 10 puanlık gösterim
- **Sinema kategorisi ikiye ayrıldı:** "Film" (`tur: "sinema"`, geriye dönük uyumluluk için eski isim korundu) ve "Dizi" (`tur: "dizi"`, yeni). Dizi için TMDB'nin ayrı TV arama/detay uçları kullanılıyor: sezon sayısı, bölüm sayısı, yaratıcı (yönetmen yerine) gibi diziye özgü alanlar otomatik geliyor.
- **Dış kaynak kimliği artık saklanıyor:** `tmdbId` (film/dizi) ve `googleBooksId` (kitap) alanları eklendi — bir sonraki adımda kuracağımız "eser sayfaları" (aynı filme verilen tüm puanların toplandığı ortak sayfa) bu kimlikler üzerinden çalışacak. Bu adımdan önce paylaşılan güncelerde bu alan boş kalacak.
- **10 puanlık gösterim:** Yıldız arayüzü korunuyor (puan verme deneyimi aynı) ama artık her yerde yanında "X/10" karşılığı da gösteriliyor (yıldız × 2). Örn. 4.5 yıldız → "9.0/10".

### Veri modeli eklemeleri
```
gonderiler/{id}  (tur: "dizi" için yeni alanlar, film ile ortak olanlar da var)
  tmdbId, googleBooksId
  sezonSayisi, bolumSayisi   (dizi'ye özel, sureDk'nin karşılığı)
  yonetmen                  (dizi'de "yaratıcı" anlamında kullanılıyor, sadece etiket değişiyor)
```

- **Yazı içine görsel ekleme:** Yazı yazarken "🖼 Görsel Ekle" butonuyla bir görsel URL'i imlecin bulunduğu yere eklenir. Kural basit: bir görsel linki kendi satırında (boş satırla ayrılmış) durursa otomatik olarak resim olarak gösterilir — özel bir sözdizimi öğrenmeye gerek yok.
- **Paragraf yapısı korunuyor:** Kopyala-yapıştır yapılan metinlerde paragraf araları artık gösterimde de korunuyor (önceden tek bir bloğa sıkışıyordu).
- **Yazı kategorisi:** Deneme yazıları veya film/kitap kartı iliştirilmiş incelemeler. "Film İncelemesi" / "Kitap İncelemesi" seçilince TMDB/Google Books'tan hafif bir referans kartı (başlık, yıl/yazar, kapak) eklenebiliyor; "Deneme" bağımsız bir blog yazısı, puan alanı yok.
- **Gezi ve Etkinlik kategorileri:** Günce Ekle'de artık 4 kategori var (Sinema, Kitap, Gezi, Etkinlik). Gezi/Etkinlik API'siz, elle giriliyor: konum, tarih, opsiyonel fotoğraf URL'i. Etkinlik kategorisinde ayrıca Tiyatro/Konser/Mekan/Sergi/Diğer alt türü seçilebiliyor.
- **Topluluklar:** `/topluluklar` sayfasında sinema/kitap/genel topluluk kurma ve katılma. Her topluluğun üye listesi var.
- **Tartışma etkinlikleri ("bu film/kitap hakkında konuşalım"):** Herhangi bir sinema/kitap güncesinin detay sayfasında "+ Etkinlik Oluştur" ile tarih/saat ve açıklama (buluşma linki vb.) girilerek bir tartışma etkinliği açılabiliyor, diğer üyeler "Katıl" diyebiliyor. `/etkinlikler` sayfasında tüm yaklaşan etkinlikler tek yerde listeleniyor.

### Veri modeli eklemeleri
```
gonderiler/{id}  (tur: "yazi" için yeni alanlar)
  altTur: "deneme" | "film-incelemesi" | "kitap-incelemesi"
  ilgiliBaslik, ilgiliYil, ilgiliYazar, ilgiliPosterUrl   (incelenen eserin hafif referans kartı)
  gunce  (bu kategoride "yazın" olarak gösteriliyor, uzun format metin)

topluluklar/{id}
  ad, aciklama, tur ("Sinema"|"Kitap"|"Genel"), kurucuId, kurucuAdi, kurulmaTarihi, uyeSayisi

topluluklar/{id}/uyeler/{uid}
  katilmaTarihi

tartismaEtkinlikleri/{id}
  baslik, gonderiId, gonderiBasligi, gonderiTuru, olusturanId, olusturanAdi,
  tarih, aciklama, olusturmaTarihi, katilimcilar: [uid,...]

gonderiler/{id}  (yeni alanlar, tur "gezi"/"etkinlik" için)
  konum, etkinlikTarihi
```

## Faz 3'te bilinçli olarak eksik bırakılanlar (Faz 4+)
- Topluluklara özel akış/gönderi filtreleme (şu an topluluklar sadece üyelik/keşif amaçlı, kendi gönderi akışları yok)
- Tartışma etkinliklerinin bir topluluğa bağlanması (`topluluklId` alanı şemada var ama UI'da henüz kullanılmıyor)
- Bildirimler (biri seni takip edince, etkinliğe biri katılınca vb.)
- Moderasyon / şikayet mekanizması
- Gerçek dosya yükleme (avatar/fotoğraf hâlâ URL yapıştırma ile; Firebase Storage entegrasyonu eklenebilir)

## Ölçeklenme notu
Kişiselleştirilmiş akış, Firestore'un `in` operatörüyle "takip ettiğim herkesin
gönderileri" sorgusu yapıyor. Bu operatör en fazla 30 değer kabul ediyor —
30'dan fazla takip edilen kişi olursa kod otomatik olarak sorguyu gruplara
bölüyor, yani bir sorun çıkmaz. Ancak binlerce kullanıcılı bir ölçekte bu
yaklaşım yerine "fan-out on write" (paylaşım anında takipçilerin akışına
kopyalama) mimarisine geçmek gerekir — küçük/orta ölçekli bir topluluk için
şimdilik bu basit yaklaşım yeterli.

