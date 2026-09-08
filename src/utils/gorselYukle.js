import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase.js'

// Telefon kameralarından gelen ham fotoğraflar kolayca 5-15MB olabiliyor —
// bunları olduğu gibi yüklemek hem Storage maliyetini hem yükleme süresini
// gereksiz şişirir. Bu yüzden yüklemeden ÖNCE tarayıcıda (Canvas ile)
// yeniden boyutlandırıp JPEG'e sıkıştırıyoruz. Firebase Storage'a giden
// veri her zaman bu küçültülmüş hal — orijinal dosya hiç sunucuya gitmiyor.
function gorselSikistir(file, { maxKenar, kalite }) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxKenar || height > maxKenar) {
        if (width > height) {
          height = Math.round((height * maxKenar) / width)
          width = maxKenar
        } else {
          width = Math.round((width * maxKenar) / height)
          height = maxKenar
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Görsel işlenemedi'))), 'image/jpeg', kalite)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Bu dosya bir görsel olarak açılamadı'))
    }
    img.src = url
  })
}

// klasor: Storage içindeki hedef klasör (ör. 'avatarlar', 'gonderi-gorselleri')
// — güvenlik kuralı (storage.rules) bu klasör adlarına göre yazılıyor,
// yeni bir klasör eklersen kuralı da güncellemek gerekir.
export async function gorselYukle(file, { klasor, uid, maxKenar = 1600, kalite = 0.85 }) {
  if (!file.type.startsWith('image/')) throw new Error('Sadece görsel dosyası yükleyebilirsin (jpg, png, webp, gif...)')
  if (file.size > 20 * 1024 * 1024) throw new Error('Dosya çok büyük (20MB üstü) — daha küçük bir görsel dene')

  const sikistirilmis = await gorselSikistir(file, { maxKenar, kalite })
  const dosyaAdi = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const depoRef = ref(storage, `${klasor}/${uid}/${dosyaAdi}`)
  await uploadBytes(depoRef, sikistirilmis, { contentType: 'image/jpeg' })
  return getDownloadURL(depoRef)
}
