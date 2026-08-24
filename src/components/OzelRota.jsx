import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function OzelRota({ children }) {
  const { kullanici, yukleniyor } = useAuth()
  const location = useLocation()
  if (yukleniyor) return <p className="text-kraft text-sm">Yükleniyor...</p>
  if (!kullanici) return <Navigate to={`/giris?donus=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}
