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

## Eser sayfaları (Film / Dizi / Kitap)
- **Yeni sayfalar:** `/film/:tmdbId`, `/dizi/:tmdbId`, `/kitap/:googleBooksId` — bir eserin TMDB/Google Books'tan çekilen güncel bilgisini, o esere topluluk üyelerinin verdiği **tüm puanların ortalamasını** ve herkesin yazdığı güncelerin listesini gösteriyor.
- **Kategori keşif sayfaları:** `/filmler`, `/diziler`, `/kitaplar` — "Bizim Aramızda Popüler" (topluluğun en çok işlediği eserler, kendi verimizden hesaplanıyor) ve film/dizi için ayrıca "TMDB'de Şu An Popüler" (dış kaynak) bölümleri var.
- **Günce Ekle'ye derin bağlantı:** Eser sayfasındaki "Bu film/dizi/kitap hakkında günce yaz" butonu, Günce Ekle'yi doğrudan o esere önceden doldurulmuş şekilde açıyor (`?tur=sinema&disId=123` gibi bir link üzerinden).
- **Kişisel günceden eser sayfasına köprü:** Herhangi bir film/dizi/kitap güncesinin detay sayfasında artık "Bu filmin sayfasına git (topluluk ortalamasını gör)" linki var.

### Önemli sınırlama
Eser sayfasındaki topluluk ortalaması, sadece **bu özellikten sonra paylaşılan** güncelerden hesaplanıyor — çünkü eskiden `tmdbId`/`googleBooksId` saklanmıyordu. Geçmiş paylaşımlar bu ortalamaya dahil olmayacak.

### Veri modeli / mimari not
`useEser.js` hook'u iki şey sağlıyor: `useEserGonderileri(tur, disId)` (bir esere ait tüm gönderileri ve ortalama puanı getirir) ve `topluluktaPopulerEserler(tur)` (bir kategorideki tüm gönderileri tarayıp tmdbId/googleBooksId'ye göre gruplayarak en çok işlenenleri sıralar — küçük bir topluluk için performanslı, çok büyük veri setlerinde optimize edilmesi gerekebilir).

## Topluluk liste özelliği ("200 Film Serüveni" gibi)
- Her topluluğun sayfasında artık **Listeler** bölümü var — bir liste başlık+açıklamayla oluşturulur (örn. "200 Film Serüveni"), içine film/dizi/kitap eklenir.
- Her liste öğesi: eserin kartı (poster, başlık, yıl/yazar), **etkinlik tarihi** (topluluğun o eseri ne zaman izlediği/tartıştığı) ve **topluluk üyelerinin verdiği puanların ortalaması**.
- Üye puanları, o esere daha önce kişisel bir günce yazılmış olmasından bağımsız — liste öğesinin kendi puanlama alanı var, herkes tek tıkla puan verebiliyor (ayrı bir günce yazmaya gerek yok).
- Geçmişte yapılmış etkinlikleri (senin 200 filmlik örneğin gibi) geriye dönük eklemek istersen, her filmi tek tek "+ Eser Ekle" ile arayıp seçip o zamanki tarihi girerek listeye işleyebilirsin — otomatik bir Letterboxd aktarımı yok, elle giriş gerekiyor.

### Veri modeli eklemeleri
```
topluluklar/{id}/listeler/{listeId}
  baslik, aciklama, olusturanId, olusturanAdi, olusturmaTarihi, ogeSayisi

topluluklar/{id}/listeler/{listeId}/ogeler/{ogeId}
  tur, tmdbId, googleBooksId, baslik, yil, yazar, posterUrl,
  etkinlikTarihi, ekleyenId, eklemeTarihi,
  puanlar: { [uid]: puanDegeri }   // map olarak tutuluyor, her üye kendi puanını günceller
```

## Topluluk sayfası: kapak görseli, Gelecek/Geçmiş Etkinlik ayrımı
- **Kapak görseli:** Topluluk kurulurken veya sonradan (sadece kurucu) bir kapak fotoğrafı URL'i eklenebiliyor.
- **Gelecek Etkinlikler:** Topluluk üyeleri "+ Etkinlik Ekle" ile tarih/saat + açıklamalı bir buluşma planlayabiliyor, diğer üyeler "Katılacağım" diyebiliyor.
- **Kaynaklar ("Bunlara göz at"):** Her gelecek etkinliğin altında, hazırlık için yazı/video/makale/diğer türünde link paylaşılabiliyor.
- **Geçmiş Etkinlikler:** Eski "Listeler" özelliği kavramsal olarak burada — her liste öğesi artık en yeni tarihten en eskiye sıralanıyor (önceden tersti).

### Veri modeli eklemeleri
```
topluluklar/{id}
  kapakUrl   (yeni alan)

topluluklar/{id}/gelecekEtkinlikler/{etkinlikId}
  baslik, aciklama, tarih, olusturanId, olusturanAdi, olusturmaTarihi, katilacaklar: [uid,...]

topluluklar/{id}/gelecekEtkinlikler/{etkinlikId}/kaynaklar/{kaynakId}
  tur ("yazi"|"video"|"makale"|"diger"), baslik, url, ekleyenId, ekleyenAdi, eklemeTarihi
```

## Topluluk sayfası — genişletmeler
- **Topluluğu Düzenle:** Kurucu artık ad, açıklama, tür ve kapak görselini tek bir panelden düzenleyebiliyor.
- **Gelecek Etkinlik düzenleme:** Etkinliği oluşturan kişi başlık/tarih/açıklamayı ve bağlı film/diziyi sonradan değiştirebiliyor.
- **Gelecek Etkinliğe film/dizi bağlama:** Hem oluştururken hem düzenlerken TMDB'den bir film/dizi aranıp bağlanabiliyor; poster, yönetmen/yaratıcı, oyuncular otomatik gösteriliyor.
- **Kaynaklarda "İlgili Kitaplar":** Kaynak türlerine "Kitap" eklendi — Google Books'tan arayıp seçtiğinde kapak+yazar ile ayrı bir "İlgili Kitaplar" bölümünde gösteriliyor (düz linklerden görsel olarak ayrışıyor).
- **Geçmiş Etkinlik önizlemesi:** Her liste kartının altında, o listenin en son 10 eserinin poster şeridi görünüyor (listeye tıklamadan hızlı bir önizleme).
- **Eser sayfasında "Senin Puanın":** Artık hem kişisel günceler hem topluluk listelerindeki puanlar birlikte hesaplanıyor — bir eseri sadece bir topluluk listesinde puanlamış olsan bile, o eserin sayfasında "Senin Puanın" kutusu görünüyor ve topluluk ortalamasına dahil oluyor.

### Önemli — yeni bir Firestore indeksi gerekebilir
Eser sayfasındaki puan birleştirme, topluluk listeleri arasında arama yapan bir **collectionGroup** sorgusu kullanıyor. Firestore ilk çalıştırıldığında muhtemelen bir indeks oluşturman gerektiğini söyleyecek — tarayıcı konsolundaki (F12) hata mesajında çıkan linke tıklaman yeterli, otomatik olarak doğru indeksi oluşturuyor.


- Topluluklara özel akış/gönderi filtreleme (şu an topluluklar sadece üyelik/keşif amaçlı, kendi gönderi akışları yok)
- Tartışma etkinliklerinin bir topluluğa bağlanması (`topluluklId` alanı şemada var ama UI'da henüz kullanılmıyor)
- Bildirimler (biri seni takip edince, etkinliğe biri katılınca vb.)
- Moderasyon / şikayet mekanizması
- Gerçek dosya yükleme (avatar/fotoğraf hâlâ URL yapıştırma ile; Firebase Storage entegrasyonu eklenebilir)

## Etkinlikler sayfası: Film Kulübü / Kitap Kulübü ayrımı
- `/etkinlikler` sayfası artık iki bölüme ayrılıyor: **Film Kulübü** ve **Kitap Kulübü** (bir topluluğun `tur` alanına göre; "Genel" türündeki topluluklar ayrı bir üçüncü bölümde toplanıyor).
- Her bölümün altında iki alt kısım var: **"Bu film/kitap hakkında konuşmalıyız"** (kişisel günce sayfalarından açılan tartışma etkinlikleri) ve **"Gelecek Etkinlik"** (topluluk sayfalarında oluşturulan buluşmalar).
- Topluluk etkinlikleri artık **hangi topluluğun düzenlediğini** gösteriyor (🏛 rozeti, topluluk sayfasına link).

### Veri modeli eklemeleri
```
topluluklar/{id}/gelecekEtkinlikler/{etkinlikId}
  topluluklId, topluluklAd, topluluklTur   (yeni alanlar — küresel Etkinlikler sayfasında gruplama/gösterim için)
```

### Önemli — yeni bir Firestore indeksi gerekebilir
Bu özellik de bir **collectionGroup** sorgusu kullanıyor (tüm topluluklardaki gelecek etkinlikleri tek seferde çekmek için). İlk çalıştırıldığında Firestore bir indeks oluşturman gerektiğini söyleyebilir — F12 konsolundaki linke tıklaman yeterli.

## Nerede İzlenebilir ve Kişi Sayfaları
- **Nerede İzlenebilir:** Film/dizi sayfalarında artık TMDB'nin JustWatch verisi üzerinden Türkiye'deki abonelik/kiralama/satın alma seçenekleri, platform logolarıyla gösteriliyor. JustWatch atıfı da ekleniyor (TMDB'nin kullanım şartı).
- **Kişi sayfaları (`/kisi/:tmdbId`):** Yönetmen/yaratıcı ve oyuncu isimleri artık tıklanabilir. Bir kişiye tıklayınca TMDB'den o kişinin tüm filmografisi (yönetmenlik ve oyunculuk ayrı ayrı) poster ızgarası halinde listeleniyor.
- **Kapsam:** Eser sayfalarında (`/film/...`, `/dizi/...`) her zaman çalışıyor (veri TMDB'den taze çekiliyor). Kişisel günce sayfalarında da çalışıyor — artık gönderi kaydedilirken yönetmen/oyuncuların TMDB kimlikleri de saklanıyor. **Bu özellikten önce paylaşılmış eski güncelerde** bu kimlikler yok, o yüzden onlarda isimler düz metin olarak kalmaya devam ediyor (geriye dönük otomatik dönüşüm yok).

### Veri modeli eklemeleri
```
gonderiler/{id}  (tur: "sinema"/"dizi" için yeni alanlar)
  yonetmenListesi: [{id, name}]
  oyuncularListesi: [{id, name}]
```

## Mimari değişiklik: collectionGroup sorguları kaldırıldı
Firebase konsolunda "collection group index" oluşturma adımı beklenenden çok daha
zahmetli/hataya açık çıktı, bu yüzden "Gelecek Etkinlikler" ve "Liste Öğeleri"
artık `topluluklar/{id}/...` altında gömülü değil, **üst seviye koleksiyonlar**
(`gelecekEtkinlikler`, `listeOgeleri`) olarak tutuluyor, içlerinde `topluluklId`
(ve liste öğeleri için ayrıca `listeId`) alanı var. Bu sayede hem topluluk
sayfası hem küresel Etkinlikler sayfası hem eser sayfası basit `where()`
sorgularıyla çalışıyor — hiçbir özel/collection-group indeksi gerekmiyor.

**Önemli:** Bu değişiklikten önce oluşturulmuş gelecek etkinlikler ve liste
öğeleri (eski nested yapıda kalmış test verileri) artık uygulama tarafından
görünmüyor — veri silinmedi, sadece sorgular artık farklı bir koleksiyona
bakıyor. Bunları yeniden eklemen gerekiyor.


Kişiselleştirilmiş akış, Firestore'un `in` operatörüyle "takip ettiğim herkesin
gönderileri" sorgusu yapıyor. Bu operatör en fazla 30 değer kabul ediyor —
30'dan fazla takip edilen kişi olursa kod otomatik olarak sorguyu gruplara
bölüyor, yani bir sorun çıkmaz. Ancak binlerce kullanıcılı bir ölçekte bu
yaklaşım yerine "fan-out on write" (paylaşım anında takipçilerin akışına
kopyalama) mimarisine geçmek gerekir — küçük/orta ölçekli bir topluluk için
şimdilik bu basit yaklaşım yeterli.

## Favoriler, İzleyeceklerim, Oyuncu Puanlama, Yorumlarım
- **Favoriler:** Film/dizi/kitap sayfalarında ve kişi sayfalarında "☆ Favorilere Ekle" butonu. Profilde kategoriye göre (Filmler/Diziler/Kitaplar/Oyuncular) ayrılmış bir Favoriler sekmesi var.
- **İzleyeceklerim:** Film/dizi/kitap sayfalarında "+ İzleyeceklerime Ekle" butonu. Profilde ayrı bir sekme, her öğenin yanında kaldırma (✕) butonu var.
- **Oyunculara puan/yorum:** Kişi sayfalarında artık 0.5-5 yıldız + kısa yorumla değerlendirme yapılabiliyor, topluluk ortalaması ve herkesin yorumları gösteriliyor (film/dizi eser sayfalarıyla aynı mantık).
- **Yorumlarım:** Yorumlar artık üst seviye bir koleksiyonda tutuluyor (`gonderiId` alanıyla filtreleniyor), bu sayede profilde "Yorumlarım" sekmesinde başkalarının güncelerine bıraktığın tüm yorumları, ilgili güncenin linkiyle birlikte görebiliyorsun.

### Veri modeli eklemeleri
```
favoriler/{uid}_{tur}_{disId}
  kullaniciId, tur ("sinema"|"dizi"|"kitap"|"kisi"), disId, baslik, alt, posterUrl, eklemeTarihi

izlenecekler/{uid}_{tur}_{disId}
  kullaniciId, tur, disId, baslik, alt, posterUrl, eklemeTarihi

kisiDegerlendirmeleri/{kisiTmdbId}_{uid}
  kisiTmdbId, kullaniciId, kullaniciAdi, puan, yorum, tarih

yorumlar/{id}   (artık gonderiler/{id}/yorumlar altında DEĞİL, üst seviyede)
  gonderiId, gonderiBasligi, yazarId, yazarAdi, metin, tarih
```

### Önemli — geçmiş yorumlar
Yorumlar sistemi üst seviye koleksiyona taşındığı için, **bu değişiklikten önce
yazılmış yorumlar** artık görünmüyor (eski konumda kaldılar, silinmediler).
Yeni yorumlar sorunsuz çalışacak.


