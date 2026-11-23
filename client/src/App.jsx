import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/patient/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import SetPassword from './pages/auth/SetPassword';
import Profile from './pages/patient/Profile';
import BookingSoon from './pages/patient/BookingSoon';
import StaffPending from './pages/staff/StaffPending';
import PatientLayout from './layouts/PatientLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import NotFound from './pages/NotFound';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/definir-senha" element={<SetPassword />} />

          <Route element={<ProtectedRoute roles={['patient']} />}>
            <Route element={<PatientLayout />}>
              <Route path="/paciente" element={<Dashboard />} />
              <Route path="/paciente/perfil" element={<Profile />} />
              <Route path="/agendar" element={<BookingSoon />} />
            </Route>
          </Route>

          <Route
            path="/medico"
            element={<ProtectedRoute roles={['doctor']} element={<StaffPending role="medico" />} />}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute roles={['admin']} element={<StaffPending role="admin" />} />}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
