import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'

// Sinema Odası: Daily.co oda adresi + kişiye özel giriş anahtarını Cloud
// Function'dan alır (API anahtarı tarayıcıya hiç inmez).
const toplantiGirisiCallable = httpsCallable(functions, 'toplantiGirisi')

export async function toplantiGirisiAl(etkinlikId) {
  try {
    const { data } = await toplantiGirisiCallable({ etkinlikId })
    return data // { url, token, moderatorMu, bitisMs }
  } catch (err) {
    // HttpsError mesajları Türkçe ve kullanıcıya gösterilebilir.
    if (err?.code === 'functions/internal' || err?.code === 'functions/not-found') {
      throw new Error('Sunucuya ulaşılamadı. Biraz sonra tekrar dene; sürerse yöneticiye haber ver.')
    }
    throw new Error(err?.message || 'Odaya bağlanılamadı.')
  }
}

// Üyeler etkinlik saatinden 3 saat önce – 8 saat sonra arasında girebilir
// (sunucu da aynı kuralı uygular; bu sadece düğmeyi göstermek için).
export function odaAcikMi(etkinlik, simdi = Date.now()) {
  if (!etkinlik?.tarih) return true
  const t = new Date(etkinlik.tarih).getTime()
  if (!Number.isFinite(t)) return true
  return simdi >= t - 3 * 3600e3 && simdi <= t + 8 * 3600e3
}

// Sinema temalı Daily Prebuilt renkleri (tema bağımsız, sabit).
export const ODA_TEMASI = {
  colors: {
    accent: '#C9A227',
    accentText: '#0b0b10',
    background: '#0b0b10',
    backgroundAccent: '#1a1a24',
    baseText: '#f5f0e1',
    border: '#2e2e3a',
    mainAreaBg: '#0b0b10',
    mainAreaBgAccent: '#1a1a24',
    mainAreaText: '#f5f0e1',
    supportiveText: '#b9b2a3',
  },
}
