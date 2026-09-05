// Storytel'in "damla/alev" logosu — Tabler Icons'ın (MIT lisanslı, Paweł
// Kuna) açık kaynaklı "brand-storytel" çizimi. currentColor kullanıyor,
// bu yüzden her yerde STORYTEL_TURUNCU (bkz. aşağı) ile renklendiriliyor —
// resmi marka renk kodu hiçbir yerde açıkça yayınlanmamış, bu yüzden
// gönderilen referans görsellerle görsel olarak eşleşen bir turuncu ton
// kullanıldı.
export const STORYTEL_TURUNCU = '#FF5B22'

export default function StorytelIkon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Storytel</title>
      <path d="M4.103 22c2.292 -2.933 16.825 -2.43 16.825 -11.538c0 -6.298 -4.974 -8.462 -8.451 -8.462c-3.477 0 -9.477 3.036 -9.477 11.241c0 6.374 1.103 8.759 1.103 8.759" />
    </svg>
  )
}
