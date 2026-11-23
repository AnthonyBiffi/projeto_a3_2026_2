import { Outlet, Link } from 'react-router-dom';
import PublicHeader from '../components/layout/PublicHeader';

export default function PatientLayout() {
  return (
    <div>
      <PublicHeader />
      <nav aria-label="Navegação do paciente" style={{ display: 'flex', gap: 16, padding: '12px 24px' }}>
        <Link to="/paciente">Consultas</Link>
        <Link to="/agendar">Agendar</Link>
        <Link to="/paciente/perfil">Meu perfil</Link>
      </nav>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
