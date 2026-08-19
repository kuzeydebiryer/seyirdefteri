import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Başlangıç havuzu — ~200 konu. 500'e tamamlamak gerçek bir içerik üretim
// işi; havuz Firestore'da tutulduğundan (sabit kod değil), zamanla hem siz
// hem de topluluk üyeleri (konuOner ile) yeni konular ekleyip
// büyütebilirsiniz. Havuz kaç konu olursa olsun sistem çalışır — sadece
// "aynı konunun tekrarına kadar geçen süre" havuz büyüklüğüyle uzar.
export const BASLANGIC_KONULARI = [
  'Zamanın nasıl aktığını gerçekten hissettiğin bir an oldu mu?',
  'Çocukken sahip olduğun ve hâlâ özlediğin bir şey var mı?',
  'Bir şarkı hayatının bir dönemini nasıl değiştirdi?',
  'En son ne zaman gerçekten "şimdi"de olduğunu hissettin?',
  'Hiç tanımadığın biriyle kurduğun anlamlı bir bağ oldu mu?',
  'Vazgeçmek zorunda kaldığın bir hayalin var mı?',
  'Sessizlik seni rahatsız mı eder, huzurlu mu hissettirir?',
  'Bir mekanın senin için özel olmasını ne belirler?',
  'Geçmişe bir mektup yazsan, hangi yaşındaki kendine yazardın?',
  'Bugüne kadar aldığın en cesur karar hangisiydi?',
  'Yalnız kalmakla yalnızlaşmak arasındaki fark ne senin için?',
  'Hangi alışkanlığından vazgeçmek en zor olurdu?',
  'Bir yabancı dile aşina olsan, o dilde nasıl bir insan olurdun?',
  'Hayatındaki en beklenmedik dönüm noktası neydi?',
  'Kendini en çok ne zaman "ait" hissediyorsun?',
  'Unutmak istediğin ama unutamadığın bir anın var mı?',
  'Bir günlük evrenin durduğunu düşünsen, ne yapardın?',
  'Sence insanları gerçekten değiştiren şey nedir?',
  'Hayatında hiç "doğru zamanda doğru yerde" olduğunu hissettin mi?',
  'Bir rüyanın seni gerçekten etkilediği oldu mu?',
  'Kaybettiğin ama hâlâ seninle olan biri var mı?',
  'Sıradan bir günün içindeki en güzel an genelde ne oluyor?',
  'Bir kitabın/filmin sana söylediği ve asla unutmadığın bir cümle var mı?',
  'Kendi sesini duyduğunda ne hissediyorsun?',
  'Geçmişin seni hâlâ nasıl şekillendiriyor?',
  'Bir şeyi "anladığını" ne zaman gerçekten anlarsın?',
  'Hayatında hiç bir yabancının sözü seni derinden etkiledi mi?',
  'Kendine en çok kızdığın an hangisiydi?',
  'Bir şehri/mahalleyi "ev" yapan şey nedir sence?',
  'İçindeki çocuk hâlâ nerede yaşıyor?',
  'Bir insanı ilk gördüğünde neye bakarsın?',
  'Kaybolmuş bir alışkanlığın (mektup yazmak gibi) yerini ne aldı senin hayatında?',
  'Bir anıyı bu kadar canlı tutan şey koku mu, ses mi, görüntü mü?',
  'Hayatının bir filmini çeksen, açılış sahnesi ne olurdu?',
  'Kendini savunmadan dinleyebildiğin biri var mı?',
  'Bir gün bittiğinde neye bakıp "iyi bir gündü" dersin?',
  'Sence insan ne zaman gerçekten büyür?',
  'Yaşadığın bir pişmanlık, seni bugün nasıl biri yaptı?',
  'Bir yerde "sıkışmış" hissettiğin oldu mu, nasıl çıktın?',
  'Kendini en özgür hissettiğin an neydi?',
  'Bir insanı özlemek ile bir dönemi özlemek arasındaki fark ne?',
  'Hayatındaki en büyük tesadüf neydi?',
  'Bir şeyi bırakmanın tam zamanı olduğunu nasıl anlarsın?',
  'Küçükken büyüdüğünde olacağını sandığın şey oldun mu?',
  'Bir gün her şeyi unutsan, hangi anıyı en son kaybetmek isterdin?',
  'Sence gerçek cesaret sessizce mi olur, gösterişle mi?',
  'Kendi hikayeni anlatırken en çok hangi bölümü atlarsın?',
  'Bir kararsızlığın seni hangi yola sürükledi?',
  'Hayatında bir kapı kapanınca gerçekten başka bir kapı açıldı mı?',
  'Yalnız bir yolculukta kendinle ilgili ne öğrendin?',
  'Bir insanın gözlerinde neyi ararsın?',
  'Kendine hâlâ affetmediğin bir şey var mı?',
  'Bir mevsim değişimi seni nasıl etkiler?',
  'Hayatındaki en sessiz ama en etkili an hangisiydi?',
  'Bir şeyi "çok istemek" ile "gerçekten ihtiyaç duymak" arasındaki fark nedir?',
  'Kendi kendine söylediğin ve inanmaya çalıştığın bir yalan var mı?',
  'Bir insanı, sadece nasıl güldüğünden ne kadar tanıyabilirsin?',
  'Hayatının hangi döneminde en çok kendin gibiydin?',
  'Bir şeyden vazgeçtikten sonra hafiflediğini hissettin mi hiç?',
  'Kendini en çok neyle avutursun?',
  'Bir yer değişikliği seni gerçekten değiştirdi mi hiç?',
  'Hayattaki en büyük öğretmenin kimdi/ne oldu?',
  'Bir şeyin "yeterince iyi" olduğuna nasıl karar verirsin?',
  'Kendi sınırlarını ilk ne zaman fark ettin?',
  'Bir gün geriye dönüp bugüne baksan, ne görmek isterdin?',
  'Hayatında bir "ilk"in seni bu kadar etkilemesinin sebebi ne?',
  'Kendini savunmak zorunda kalmadığın bir yer var mı?',
  'Bir söz, tuttuğunda değil söylendiğinde mi anlam kazanır?',
  'Hayatının hangi anını bir daha hiç yaşamak istemezsin?',
  'Kendi başarısını başkalarının gözünden mi ölçersin, kendi gözünden mi?',
  'Bir ilişkinin bittiğini, bitmeden önce nasıl anlarsın?',
  'Hayatındaki en büyük "eğer" cümlesi hangisi?',
  'Kendine söylemekten kaçındığın bir gerçek var mı?',
  'Bir insanın seni terk etmesiyle senin bir şeyi terk etmen arasında fark var mı?',
  'Hayatının neresinde en çok "şanslıyım" dersin?',
  'Kendi geçmişinle barıştın mı, yoksa hâlâ tartışıyor musun?',
  'Bir şeyi kaybetmeden değerini anlamak mümkün mü?',
  'Hayatındaki en uzun bekleyiş neydi, buna değdi mi?',
  'Kendini bir kelimeyle tanımlasan hangisi olurdu, neden?',
  'Bir yabancı şehirde kendini "evde" hissettiğin oldu mu?',
  'Hayatının hangi anı hâlâ seni gülümsetir?',
  'Kendi hatalarına en çok ne zaman tahammül edemezsin?',
  'Bir insanın "değiştiğini" nasıl anlarsın — sözlerinden mi, sessizliğinden mi?',
  'Hayatındaki en büyük korkunla ne zaman yüzleştin?',
  'Kendine karşı en dürüst olduğun an neydi?',
  'Bir gün her şeyi baştan seçebilsen, neyi aynı bırakırdın?',
  'Hayatının hangi döneminde en çok "kayboldum" dedin?',
  'Kendi sessizliğini dinleyebildiğin bir yerin var mı?',
  'Bir anıyı paylaşmakla onu koruyarak saklamak arasında ne seçersin?',
  'Hayatındaki en büyük "vazgeçiş" seni özgürleştirdi mi, kısıtladı mı?',
  'Kendini bir mevsime benzetsen hangisi olurdun?',
  'Bir insanı affetmek onu unutmak mı, yoksa hatırlayıp bırakmak mı?',
  'Hayatının hangi anında kendinden gurur duydun?',
  'Kendi sesini ilk kez gerçekten duyduğun an ne zamandı?',
  'Bir şeyin peşinden gitmekten mi korkarsın, ona ulaşamamaktan mı?',
  'Hayatındaki en sevdiğin sıradan alışkanlık ne?',
  'Kendini bir renkle tanımlasan hangisi olurdu?',
  'Bir insanın hayatına girmesiyle nasıl değiştin?',
  'Hayatının hangi anını bir fotoğraf karesi gibi hatırlarsın?',
  'Kendi zayıflığını ilk kime açtın?',
  'Bir şeyi "artık yeter" deyip bıraktığın an neydi?',
  'Hayatındaki en büyük şükran nedir?',
  'Kendini en çok kimin yanında güvende hissediyorsun?',
  'Bir mektubu asla göndermesen bile yazmak seni rahatlatır mı?',
  'Hayatının hangi köşesinde hâlâ çocuksun?',
  'Kendi kendine sarıldığın bir an oldu mu?',
  'Bir şeyin bitmesiyle başka bir şeyin başladığını hissettin mi?',
  'Hayatındaki en anlamsız görünen ama aslında çok değerli an neydi?',
  'Kendini bir mevsim yağmuruna benzetsen nasıl yağardın?',
  'Bir insanı gerçekten dinlemek onu düzeltmeye çalışmadan mümkün mü?',
  'Hayatının hangi anında "artık büyüdüm" dedin?',
  'Kendi hayalini kimseyle paylaşmadan yaşadığın oldu mu?',
  'Bir şehrin sokağı seni nasıl bir insana dönüştürür?',
  'Hayatındaki en güzel yalnızlık anın neydi?',
  'Kendine acımak ile kendini anlamak arasındaki çizgi nerede?',
  'Bir şeyi kaybettiğinde önce ne hissedersin — öfke mi, hüzün mü?',
  'Hayatının hangi bölümünü bir daha yazma şansın olsa değiştirirdin?',
  'Kendi başarısızlığını en son ne zaman kutladın?',
  'Bir insanın gülüşü seni nasıl etkiler?',
  'Hayatındaki en büyük öğrenme, acı çekerek mi geldi?',
  'Kendini bir müzik türüne benzetsen hangisi olurdun?',
  'Bir şeyi anlamadan sevmek mümkün mü sence?',
  'Hayatının hangi anında "işte buradayım" dedin?',
  'Kendi çelişkilerinle barışabildin mi?',
  'Bir yolculuğun seni değiştirdiği anı hatırlıyor musun?',
  'Hayatındaki en özlediğin ses hangisi?',
  'Kendini bir kapıya benzetsen açık mı olurdun, kapalı mı?',
  'Bir şeyin peşinden koşmaktan vazgeçtiğinde ne öğrendin?',
  'Hayatının hangi kısmı hâlâ tamamlanmamış gibi hissettiriyor?',
  'Kendi sınırlarını başkasına anlatmakta zorlanır mısın?',
  'Bir anının rengini tarif etsen nasıl olurdu?',
  'Hayatındaki en büyük teselli neydi?',
  'Kendini bir kitabın hangi bölümünde bulursun?',
  'Bir insanı özlemek zamanla azalır mı, biçim mi değiştirir?',
  'Hayatının hangi anında "yeter, dinlenmeliyim" dedin?',
  'Kendine en son ne zaman bir hediye verdin?',
  'Bir şeyin peşinde koşarken kendini kaybettiğini fark ettin mi hiç?',
  'Hayatındaki en sakin an neydi?',
  'Kendini bir mevsim geçişine benzetsen hangi ana denk gelirdin?',
  'Bir insanın senden vazgeçtiğini hissetmek nasıl bir şey?',
  'Hayatının hangi anında kendine güvenini yeniden buldun?',
  'Kendi hatalarını başkalarına anlatmak seni hafifletir mi?',
  'Bir şey biterken, aslında başka bir şeyin başladığını fark ettin mi?',
  'Hayatındaki en huzurlu sabah hangisiydi?',
  'Kendini bir dil olsa hangi dile benzetirdin?',
  'Bir insanla paylaştığın sessizlik konuşmaktan daha mı değerliydi?',
  'Hayatının hangi anında "artık farklıyım" dedin?',
  'Kendi geçmişindeki bir versiyonuna ne söylerdin?',
  'Bir şeyi son kez yaptığını bilseydin, farklı yapar mıydın?',
  'Hayatındaki en umut verici an neydi?',
  'Kendini bir gökyüzüne benzetsen açık mı olurdu, bulutlu mu?',
  'Bir insanın yanında olmadan da varlığını hissettiğin oldu mu?',
  'Hayatının hangi anında sabrının sınırını gördün?',
  'Kendine söylediğin en güzel yalan hangisiydi?',
  'Bir şeyin değerini, kaybettikten sonra mı anladın?',
  'Hayatındaki en çok özlediğin dönem hangisi?',
  'Kendini bir nehre benzetsen nereye akardın?',
  'Bir insanın hayatına girip çıkması seni nasıl değiştirdi?',
  'Hayatının hangi anında en çok "canlı" hissettin?',
  'Kendi sessizliğinle nasıl bir ilişkin var?',
  'Bir şeyi affetmek, unutmaktan mı geçer, hatırlayıp bırakmaktan mı?',
  'Hayatındaki en beklenmedik iyilik neydi?',
  'Kendini bir ağaca benzetsen kökleri nereye uzanırdı?',
  'Bir insanın sözü mü, sessizliği mi seni daha çok etkiler?',
  'Hayatının hangi anında en çok kırıldın, ama ayakta kaldın?',
  'Kendine en son ne zaman "iyi iş çıkardın" dedin?',
  'Bir şeyi bırakmadan önce ne kadar sürede karar verirsin?',
  'Hayatındaki en değerli ama küçük an neydi?',
  'Kendini bir mevsim rüzgarına benzetsen nasıl eserdin?',
  'Bir insanın yanında sustuğunda ne anlatmak istersin?',
  'Hayatının hangi anında kendinle en çok gurur duydun?',
  'Kendi kırılganlığını göstermekten korkar mısın?',
  'Bir şeyin sonunu bilerek yaşamak, bilmeden yaşamaktan daha mı zor?',
  'Hayatındaki en yalın mutluluk anı neydi?',
  'Kendini bir yıldıza benzetsen ne kadar parlardın?',
  'Bir insanın seni değiştirdiğini itiraf etmek zor mu gelir?',
  'Hayatının hangi anında "bu benim gerçek halim" dedin?',
  'Kendine acı verse de gerçeği duymayı tercih eder misin?',
  'Bir şeyin peşinden gitmekten vazgeçince ne kazandın, ne kaybettin?',
  'Hayatındaki en sıcak anı hangisiydi?',
  'Kendini bir kapı eşiğinde hissettiğin bir an oldu mu?',
  'Bir insanın gözünde kendini nasıl görürsün?',
  'Hayatının hangi anı seni en çok olgunlaştırdı?',
  'Kendine karşı en sabırsız olduğun konu ne?',
  'Bir şeyi kaybetmenin seni nasıl büyüttüğünü fark ettin mi?',
]

// İKİNCİ DALGA — kültür, sanat, sinema, psikoloji, kitap, tiyatro ve felsefe
// eksenli, daha analitik/tartışmaya açık konular (ilk dalga daha kişisel/
// içe dönüktü). "kaynak: 'dalga2'" etiketiyle ayrı tutulup tek seferlik
// eklenebiliyor (bkz. havuzuGenislet).
export const IKINCI_DALGA_KONULARI = [
  // Sinema
  'Bir filmi "büyük" yapan şey mi, yoksa izleyeni değiştirmesi mi?',
  'Sessiz sinema, sesli sinemadan gerçekten daha mı "saf" bir sanattı?',
  'Bir yönetmenin imzası, en çok hangi sahnede belli olur — kurguda mı, kadrajda mı?',
  'Auteur kavramı hâlâ anlamlı mı, yoksa sinema artık kolektif bir üretim mi?',
  'Bir filmi izlerken müziğin farkına varmamak, iyi bir film müziğinin işareti midir?',
  'Uyarlamalar, orijinal esere sadık kaldıkça mı, ondan uzaklaştıkça mı başarılı olur?',
  'Bir "kült film" ile "iyi film" arasındaki fark ne sizce?',
  'Sinemada belirsiz/açık sonlar, izleyiciye saygı mı, kolaycılık mı?',
  'Bir filmin ilk 5 dakikası, geri kalanını nasıl belirler?',
  'Kara mizah, bir toplumun neyle yüzleşemediğinin göstergesi midir?',
  'Bir film müziği besteci, filmden bağımsız bir sanat eseri sayılabilir mi?',
  'Sinemada yavaşlık (ağır çekim, uzun plan) her zaman bir anlam mı taşır?',
  'Bir aktörün "kendini kaybetmesi" ile rolü oynaması arasında sınır nerede?',
  'Belgesel, "gerçeği" gösterir mi yoksa gerçeğin bir yorumunu mu?',
  'Bir filmde diyalogsuz geçen bir sahne, en çok neyi anlatabilir?',
  // Tiyatro
  'Tiyatroyu sinemadan ayıran şey, sadece "canlılık" mı?',
  'Bir oyuncunun sahnede terlemesi, izleyiciye neyi hissettirir?',
  'Dördüncü duvarı yıkmak, bir oyunu daha mı gerçek, daha mı yapay yapar?',
  'Trajedi ile komedi, aynı insan durumunun iki yüzü müdür?',
  'Bir oyunun her gece "aynı ama farklı" olması neyi değiştirir?',
  'Rejisörün görünmezliği, bir oyunun başarısının şartı mıdır?',
  'Doğaçlama tiyatro, yazılı metinden daha mı "dürüst"tür?',
  'Bir sahne tasarımı, oyuncudan daha fazla mı anlatabilir bazen?',
  'Seyircinin sessizliği mi, kahkahası mı bir oyuncuyu daha çok besler?',
  'Antik Yunan tragedyaları bugün hâlâ neden bu kadar "güncel" hissettiriyor?',
  // Kitap / Edebiyat
  'Bir romanın ilk cümlesi, kitabın kaderini ne kadar belirler?',
  'Okurken bir karakteri sevmek zorunda mısınız, onu anlamak yeterli mi?',
  'Bir kitabı "bitirmek", onu gerçekten anlamış olmak mıdır?',
  'Güvenilmez anlatıcı, okurla kurulan en dürüst ilişki midir aslında?',
  'Bir yazarın hayatını bilmek, eserini okuma biçiminizi değiştirir mi?',
  'Şiir, düzyazının söyleyemediği neyi söyler?',
  'Bir kitabı yeniden okumak, aynı kitabı mı okumaktır?',
  'Distopyalar, geleceği mi anlatır yoksa bugünü mü abartır?',
  'Bir romanın sonunu bilmeden okumak, gerçekten mümkün müdür (spoiler çağında)?',
  'Kısa öykü, bir romanın "özeti" değil de neden ayrı bir sanattır?',
  'Bir kitabı çevirmek, onu yeniden yazmak mıdır?',
  'Otobiyografik kurgu, gerçeği mi çarpıtır yoksa daha derin bir gerçeğe mi ulaşır?',
  'Bir kütüphanede kaybolmak ile bir kitapta kaybolmak aynı duygu mudur?',
  'Klasikler neden "klasik" kalır — zamansızlık mı, alışkanlık mı?',
  'Bir kitabı yarım bırakmak, ona haksızlık mıdır?',
  // Sanat (genel)
  'Bir sanat eserine "anlamıyorum" demek, onunla ilişki kurmanın bir yolu olabilir mi?',
  'Çirkinlik, sanatta güzellikten daha mı güçlü bir araçtır bazen?',
  'Bir eserin değerini, sanatçının niyeti mi belirler, izleyicinin yorumu mu?',
  'Sokak sanatı, müzedeki bir eserden daha mı "gerçek"tir?',
  'Kopya bir eser, orijinalin aurasını hiç taşıyabilir mi?',
  'Sanat, acıyı hafifletir mi yoksa onu daha görünür mü kılar?',
  'Bir müzede saatlerce durup bir tabloya bakmak neyi arar aslında?',
  'Sanatçının kişisel hayatındaki hatalar, eserinin değerini gölgeler mi?',
  'Yapay zekâ ile üretilen bir eser, "sanat" sayılır mı — neden?',
  'Restore edilmiş bir eser, hâlâ aynı eser midir?',
  // Müzik (kültür-sanat şemsiyesi altında)
  'Bir şarkıyı sevmek için sözlerini anlamak şart mı?',
  'Müzik, bir dönemin ruhunu mu yansıtır, yoksa onu mu yaratır?',
  'Bir melodiyi unutup sonra aniden hatırlamak neden bu kadar güçlü bir duygu?',
  'Sessizlik, müziğin bir parçası mıdır yoksa yokluğu mudur?',
  // Felsefe
  'Özgür irade var mı, yoksa sadece öyle hissediyor muyuz?',
  '"Kendini bilmek" mümkün mü, yoksa sürekli bir yanılsama mı?',
  'Mutluluk bir amaç mıdır, yoksa bir yan etkisi midir?',
  'Zaman gerçekten "akar" mı, yoksa bu sadece bilincimizin bir hilesi mi?',
  'Bir yalanın hiç ortaya çıkmayacağını bilseniz, yine de doğruyu söyler misiniz?',
  'Kimlik, değişmeyen bir öz müdür yoksa sürekli yeniden inşa edilen bir hikaye midir?',
  'Acı çekmeden anlam bulmak mümkün mü?',
  'Ölümü bilmek, hayatı nasıl değiştirir?',
  'Adalet, herkese eşit davranmak mıdır yoksa herkese ihtiyacına göre mi?',
  'Bir eylemi "iyi" yapan, sonucu mu niyeti mi?',
  'Gerçek, keşfedilen bir şey midir yoksa inşa edilen bir şey midir?',
  'Yalnızlık bir eksiklik midir, yoksa bir olgunluk hali midir?',
  'İnsan doğası diye bir şey var mı, yoksa hepimiz koşullarımızın ürünü müyüz?',
  'Şüphe etmek, bilgiye giden yol mudur yoksa ondan kaçış mıdır?',
  'Bir toplumun "ilerlemesi" neye göre ölçülür?',
  'Özgürlük, seçenek çokluğu mudur yoksa seçebilme kapasitesi midir?',
  'Anlam, bulunan bir şey midir yoksa üretilen bir şey midir?',
  'Bir fikri savunmak için ona inanmak şart mı?',
  'Erdem, alışkanlıkla mı öğrenilir yoksa doğuştan mı gelir?',
  'Varoluşun bir amacı olmak zorunda mı?',
  // Psikoloji
  'Bir anıyı her hatırlayışımızda, onu biraz değiştiriyor muyuz?',
  'Bilinçaltı, gerçekten bizi mi yönetiyor, yoksa bu sadece rahatlatıcı bir hikaye mi?',
  'Empati, öğrenilebilir bir beceri midir yoksa doğuştan gelen bir kapasite midir?',
  'Bir travmayı "atlatmak" mümkün mü, yoksa onunla yaşamayı mı öğreniriz?',
  'Kendini tanımak, başkalarının sizi nasıl gördüğünü bilmekten mi geçer?',
  'Erteleme, tembellik midir yoksa korkunun bir biçimi midir?',
  'Bir alışkanlığı değiştirmek neden bu kadar zor — irade mi eksik, yoksa yöntem mi yanlış?',
  'Duygularımızı bastırmak mı, yoksa onları isimlendirmek mi bizi daha çok özgürleştirir?',
  'Öfke, her zaman bir şeyin işareti midir — neyin?',
  'Kıskançlık, sevginin bir gölgesi midir yoksa ondan tamamen ayrı bir duygu mudur?',
  'Bir ilişkide "güven" yeniden inşa edilebilir mi, yoksa sadece farklı bir biçim mi alır?',
  'Mükemmeliyetçilik, bir güç müdür yoksa gizli bir korku mudur?',
  'Rüyalarımız bize gerçekten bir şey mi anlatır, yoksa zihnin rastgele gürültüsü müdür?',
  'Bir insanın "değiştiğini" söylemek için ne kadar zaman geçmesi gerekir?',
  'Konfor alanından çıkmak her zaman gelişim midir, yoksa bazen sadece huzursuzluktur?',
  'Kendine acımak (self-pity) ile kendine şefkat göstermek arasındaki çizgi nerede?',
  'Bağlanma biçimimiz, yetişkinlikte ilişkilerimizi ne kadar belirler?',
  'Bir insanın "iyi bir dinleyici" olması, sessiz kalmasıyla mı ölçülür?',
  // Kültür (genel/toplumsal)
  'Nostalji, geçmişi mi özler yoksa şimdiyi mi eleştirir?',
  'Bir kültürün mizahı, o toplumun neyinden korktuğunu gösterir mi?',
  'Gelenek, bir köprü müdür yoksa bir zincir midir?',
  'Bir dilin kaybolması, o dille düşünülen dünyanın da kaybolması mıdır?',
  'Popüler kültür, "sığ" olmak zorunda mı?',
  'Bir toplumun sanatı, o toplumun vicdanı sayılabilir mi?',
  'Kuşaklar arası fark, gerçekten büyüyor mu yoksa hep aynı mı kalıyor?',
  'Bir bayram/tören, anlamını yitirdiğinde bile neden hâlâ yapılır?',
  'Yerel olanı korumak ile evrensele açılmak arasında bir denge mümkün mü?',
  'Bir toplumun "ilerici" olması, geleneklerinden tamamen kopması mı demektir?',
  'Mahremiyet kavramı, dijital çağda gerçekten değişti mi yoksa sadece görünürlüğü mü değişti?',
  'Bir şehrin hafızası, binalarında mı yaşar, insanlarında mı?',
  // Sanat-yaşam kesişimi / yaratıcılık
  'Yaratıcılık, ilhamla mı gelir yoksa disiplinle mi inşa edilir?',
  'Bir sanat eserini "bitirmiş" saymak, ne zaman mümkün olur?',
  'Kısıtlamalar (bütçe, zaman, malzeme) yaratıcılığı öldürür mü, yoksa besler mi?',
  'Amatör bir eser, profesyonel bir eserden daha "dürüst" olabilir mi?',
  'Bir eseri paylaşmadan önce mi, paylaştıktan sonra mı gerçekten "biter"?',
  'Taklit etmek, öğrenmenin bir parçası mıdır yoksa bir sınır mıdır?',
  'Bir sanatçının krizi, en iyi eserlerinin de kaynağı mıdır genelde?',
  'Eleştiri, bir eseri büyütür mü küçültür mü?',
]

// Havuzu ikinci (veya sonraki) bir dalgayla genişletir — havuzuDoldur'dan
// farklı olarak havuz BOŞ OLMAK ZORUNDA DEĞİL, sadece aynı dalganın daha
// önce eklenip eklenmediğini kontrol eder (tekrar tekrar tıklanırsa
// mükerrer eklemeyi önlemek için).
export async function havuzuGenislet(yeniKonular, dalgaEtiketi) {
  const mevcutDalga = await getDocs(query(collection(db, 'dusunceHavuzu'), where('kaynak', '==', dalgaEtiketi)))
  if (!mevcutDalga.empty) return { yazildi: 0, zatenVarMi: true }
  await Promise.all(
    yeniKonular.map((konu) => addDoc(collection(db, 'dusunceHavuzu'), { konu, eklemeTarihi: serverTimestamp(), kaynak: dalgaEtiketi }))
  )
  onbellekliHavuz = null // önbelleği geçersiz kıl, bir sonraki okumada yeniden çeksin
  return { yazildi: yeniKonular.length, zatenVarMi: false }
}

export async function havuzuDoldur() {
  const mevcut = await getDocs(collection(db, 'dusunceHavuzu'))
  if (!mevcut.empty) return { yazildi: 0, zatenVarMi: true }
  await Promise.all(
    BASLANGIC_KONULARI.map((konu) => addDoc(collection(db, 'dusunceHavuzu'), { konu, eklemeTarihi: serverTimestamp(), kaynak: 'baslangic' }))
  )
  return { yazildi: BASLANGIC_KONULARI.length, zatenVarMi: false }
}

// Topluluk üyelerinin havuza yeni konu önerebilmesi — havuzun 500'e (ve
// ötesine) büyümesi için asıl sürdürülebilir yol bu, tek seferlik bir içerik
// dökümünden çok.
export async function konuOner(konu, kullanici) {
  await addDoc(collection(db, 'dusunceHavuzu'), {
    konu: konu.trim(),
    eklemeTarihi: serverTimestamp(),
    kaynak: 'topluluk',
    onerenId: kullanici.uid,
  })
}

let onbellekliHavuz = null
async function havuzuGetir() {
  if (onbellekliHavuz) return onbellekliHavuz
  const snap = await getDocs(collection(db, 'dusunceHavuzu'))
  // Sıra, doküman ID'sine göre (Firestore otomatik ID'leri) sabitleniyor —
  // herkes aynı sırayı görsün diye tarihe değil, ID'nin kendisine göre
  // sıralıyoruz (tarih sunucu zaman damgası olduğundan istemci tarafında
  // ilk anlarda null gelebilir, ID her zaman anında hazır ve tekil).
  onbellekliHavuz = snap.docs.map((d) => ({ id: d.id, konu: d.data().konu })).sort((a, b) => a.id.localeCompare(b.id))
  return onbellekliHavuz
}

// Konu döngüsünün periyodu — kaç günde bir yenilenir. Küçük bir topluluk
// için GÜNLÜK yenilenme, bir konunun 1-2 yanıt alıp kaybolmasına yol
// açabiliyor ("ortak tartışma" hissi zayıf kalıyor). Haftalık, herkesin
// görüp katılacak zamanı olmasını, bir konunun gerçek bir yanıt kümesi
// biriktirmesini sağlıyor. Tek bir sayıyı değiştirerek (3, 5, 7...)
// ayarlanabilir.
const PERIYOT_GUN = 7

function donemBaslangicTarihi(bugunISO) {
  // Sabit bir epoch'tan (2026-01-01) itibaren kaç PERIYOT_GUN'luk dilim
  // geçtiğini hesaplayıp, o dilimin İLK gününü döndürür — böylece aynı
  // 7 günlük pencere içindeki herkes aynı "dönem anahtarı"na düşer.
  const epoch = new Date('2026-01-01T00:00:00Z')
  const bugun = new Date(bugunISO + 'T00:00:00Z')
  const gecenGun = Math.floor((bugun - epoch) / (1000 * 60 * 60 * 24))
  const donemIndeksi = Math.floor(gecenGun / PERIYOT_GUN)
  const donemBaslangici = new Date(epoch.getTime() + donemIndeksi * PERIYOT_GUN * 24 * 60 * 60 * 1000)
  return donemBaslangici.toISOString().slice(0, 10)
}

// Bir dönemin konusu — İLK hesaplandığı anda Firestore'a KALICI olarak
// yazılıyor (gununKonulari/{donemTarihi}). Bu, havuz sonradan büyüse bile
// (topluluk yeni konu önerdikçe) GEÇMİŞ dönemlerin konusunun asla
// değişmemesini garanti ediyor — arşivin güvenilir olmasının şartı bu.
export async function gununKonusuGetir() {
  const donemTarihi = donemBaslangicTarihi(new Date().toISOString().slice(0, 10))
  const kayitliRef = doc(db, 'gununKonulari', donemTarihi)
  const kayitliSnap = await getDoc(kayitliRef)
  if (kayitliSnap.exists()) return { konu: kayitliSnap.data().konu, tarih: donemTarihi }

  const havuz = await havuzuGetir()
  if (havuz.length === 0) return null

  let toplam = 0
  for (let i = 0; i < donemTarihi.length; i++) toplam += donemTarihi.charCodeAt(i)
  const secilen = havuz[toplam % havuz.length]

  await setDoc(kayitliRef, { konu: secilen.konu, konuId: secilen.id, damgaTarihi: serverTimestamp() })
  return { konu: secilen.konu, tarih: donemTarihi }
}

// Arşiv — geçmiş dönemlerin konuları, en yeniden eskiye. Sadece daha önce
// GERÇEKTEN gösterilmiş (yani gununKonulari'na yazılmış) dönemleri listeler.
export async function gecmisKonulariGetir(limitSayisi = 30) {
  const q = query(collection(db, 'gununKonulari'), orderBy('damgaTarihi', 'desc'), limit(limitSayisi))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ tarih: d.id, konu: d.data().konu }))
}

// Bugünün konusuna yazılmış günceleri getirir — "kaç kişi bugün bu konu
// hakkında yazdı" listesi. bilincAkisiKonusu alanı GonderiEkle.jsx'te
// yazı gönderilirken damgalanıyor.
export async function gununYazilariniGetir(konuMetni) {
  if (!konuMetni) return []
  const q = query(collection(db, 'gonderiler'), where('bilincAkisiKonusu', '==', konuMetni))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
  return liste
}
