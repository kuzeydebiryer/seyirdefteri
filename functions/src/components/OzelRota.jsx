import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function OzelRota({ children }) {
  const { kullanici, yukleniyor } = useAuth()
  if (yukleniyor) return <p className="text-kraft text-sm">Yükleniyor...</p>
  if (!kullanici) return <Navigate to="/giris" replace />
  return children
}
