import { Link } from 'react-router-dom';
import { brand } from '../../config/brand';

export default function PublicHeader() {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
      <Link to="/" style={{ fontWeight: 700, textDecoration: 'none' }}>{brand.name}</Link>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/paciente">Área do paciente</Link>
        <Link to="/entrar">Entrar</Link>
      </nav>
    </header>
  );
}
