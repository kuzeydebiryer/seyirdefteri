// Nobel'in resmi ücretsiz API'si — isim/yıl için güvenilir tek kaynak.
export async function nobelEdebiyatYazarlariniGetir() {
  const res = await fetch('https://api.nobelprize.org/2.1/laureates?nobelPrizeCategory=lit&limit=200&sort=desc')
  if (!res.ok) throw new Error('Nobel API yanıt vermedi')
  const data = await res.json()
  return (data.laureates || [])
    .map((l) => {
      const odul = (l.nobelPrizes || []).find((p) => p.category?.en === 'Literature') || l.nobelPrizes?.[0]
      const isim = l.knownName?.en || [l.givenName?.en, l.familyName?.en].filter(Boolean).join(' ')
      return { isim, yil: odul?.awardYear ? Number(odul.awardYear) : null }
    })
    .filter((l) => l.isim && l.yil)
    .sort((a, b) => b.yil - a.yil)
}

// Nobel API fotoğraf döndürmüyor — bir kişinin fotoğrafını Wikipedia'nın
// özet API'sinden (ücretsiz, anahtar gerekmiyor) ayrıca çekiyoruz.
export async function wikipediaFotoGetir(isim) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(isim.replace(/ /g, '_'))}`)
    if (!res.ok) throw new Error('yok')
    const data = await res.json()
    return data.thumbnail?.source || null
  } catch {
    return null
  }
}
