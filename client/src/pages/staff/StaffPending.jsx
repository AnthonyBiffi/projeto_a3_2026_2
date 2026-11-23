export default function StaffPending({ role }) {
  return (
    <main>
      <h1>{role === 'admin' ? 'Painel administrativo' : 'Painel do médico'}</h1>
      <p>Esta área está em preparação.</p>
    </main>
  );
}
