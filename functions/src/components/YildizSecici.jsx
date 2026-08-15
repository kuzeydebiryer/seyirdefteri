import { useState } from 'react'

// Tıklanabilir yıldız seçici — yarım yıldız hassasiyetiyle (her yıldızın sol
// yarısı X.5, sağ yarısı X.0 değerini seçer). Salt okunur modda (disabled)
// sadece dolu/boş oranını gösterir, tıklanamaz — topluluk ortalamasını
// göstermek için de kullanılıyor.
export default function YildizSecici({ deger, onSec, disabled = false, boyut = 'text-xl' }) {
  const [hover, setHover] = useState(null)
  const gosterilenDeger = hover ?? deger ?? 0

  return (
    <div className={`inline-flex ${boyut} leading-none`} onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((yildizNo) => {
        const doluOrani = Math.max(0, Math.min(1, gosterilenDeger - (yildizNo - 1)))
        return (
          <span key={yildizNo} className="relative inline-block">
            <span className="text-cizgi">★</span>
            <span className="absolute inset-y-0 left-0 overflow-hidden text-muhur" style={{ width: `${doluOrani * 100}%` }}>
              ★
            </span>
            {!disabled && onSec && (
              <>
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 w-1/2"
                  onMouseEnter={() => setHover(yildizNo - 0.5)}
                  onClick={() => onSec(yildizNo - 0.5)}
                  aria-label={`${yildizNo - 0.5} yıldız`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 w-1/2"
                  onMouseEnter={() => setHover(yildizNo)}
                  onClick={() => onSec(yildizNo)}
                  aria-label={`${yildizNo} yıldız`}
                />
              </>
            )}
          </span>
        )
      })}
    </div>
  )
}
