# MedClinic CRM

CRM de agendamento médico: React + Vite (front), Node + Express (API), Supabase (Auth + PostgreSQL + RLS).

## Estrutura do projeto

```text
client/                 Front-end React + Vite
server/                 API Express
supabase/migrations/    Migrações do banco
package.json            Workspaces e comandos principais
```

**Status:** Blocos 1 e 2 concluídos (banco, back-end, autenticação, tela inicial, cadastro/login e área do paciente). O agendamento (bloco 3) e os painéis de médico e admin vêm a seguir.

## Como a segurança está dividida

| Regra | API (Express) | Banco (Supabase) |
|---|---|---|
| Só o admin cadastra/edita/desativa médicos | `requireAdmin` (papel + e-mail) | policies `is_admin()` + `CHECK` em `profiles` |
| Médico vê só as próprias consultas | consultas lidas com o JWT do usuário | RLS em `appointments` por `doctor_id` |
| Paciente vê só os próprios dados | idem | RLS em `patients` e `appointments` |
| Sem horário duplicado | — | `book_appointment` + constraint `no_double_booking` |

A API usa a `service_role key` somente para convidar médicos e desfazer cadastros parciais. Todo o resto roda com o JWT do usuário, então o RLS também protege a API.

## 1. Configuração no Supabase

1. Crie um projeto em https://supabase.com.
2. **SQL Editor** → execute, nesta ordem, `supabase/migrations/001_schema.sql`, `002_patient_area.sql`, `003_staff_panels.sql`, `004_sync_existing_auth_users.sql` e `005_server_service_role_permissions.sql`.
3. **Authentication → Providers → Email**: mantenha **Confirm email** ligado e defina senha mínima de 8+ caracteres.
4. **Authentication → URL Configuration**: `Site URL` = `http://localhost:5173`; em *Redirect URLs* adicione `http://localhost:5173/**` (inclui o retorno de confirmação em `/auth/callback`).
5. **Authentication → SMTP Settings**: configure um SMTP próprio (o padrão do Supabase tem limite baixo de e-mails por hora e serve só para testes). Convites de médicos dependem disso.
6. **Authentication → Email Templates**: personalize *Confirm signup*, *Invite user* e *Reset password* se quiser. Os links de convite e de recuperação levam para `/definir-senha` (já existe no front).
7. **Project Settings → API**: copie `Project URL`, `anon public` e `service_role`. A `service_role` é secreta e fica **só** no `server/.env`.
8. **Conta do administrador**: em **Authentication → Users → Add user**, crie `anthonymendesbiffi@gmail.com` com senha e marque **Auto Confirm User**. O trigger cria o perfil `admin` automaticamente. (Qualquer outro e-mail jamais recebe esse papel.)

Se o login mostrar que `public.profiles` não está disponível, confirme no SQL Editor:

```sql
select to_regclass('public.profiles');
```

Se retornar `NULL`, execute as migrações `001` a `004` acima, nessa ordem. Se retornar `public.profiles`, mas a API continuar sem encontrar a tabela, atualize o cache do PostgREST:

```sql
notify pgrst, 'reload schema';
```

## 2. Back-end

```bash
cd server
cp .env.example .env     # preencha SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev              # http://localhost:3333
```

Verificação rápida: `curl http://localhost:3333/health` → `{"status":"ok"}`.

### Endpoints do bloco 1

| Método | Rota | Quem |
|---|---|---|
| GET | `/health` | público |
| GET | `/api/me` | qualquer usuário logado |
| GET | `/api/admin/doctors` · `/:id` | admin |
| POST | `/api/admin/doctors` | admin (cadastra + agenda + convite) |
| PATCH | `/api/admin/doctors/:id` | admin (e-mail não é editável) |
| PATCH | `/api/admin/doctors/:id/status` `{ "active": false }` | admin |
| PUT | `/api/admin/doctors/:id/schedules` | admin |
| POST | `/api/admin/doctors/:id/resend-invite` | admin |

Autenticação: header `Authorization: Bearer <access_token do Supabase>`.

Exemplo de corpo do `POST /api/admin/doctors`:

```json
{
  "name": "João Silva",
  "email": "joao@clinica.com",
  "specialty": "Cardiologia",
  "phone": "(11) 98888-7777",
  "crm": "123456/SP",
  "appointment_type": "ambas",
  "schedules": [
    { "weekday": 1, "start_time": "08:00", "end_time": "12:00", "appointment_duration": 30, "break_interval": 0 },
    { "weekday": 3, "start_time": "08:00", "end_time": "12:00", "appointment_duration": 30 }
  ]
}
```

`weekday`: 0 = domingo … 6 = sábado.

## 3. Front-end

```bash
cd client
cp .env.example .env     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (só a chave anon!) e VITE_API_URL
npm install
npm run dev              # http://localhost:5173
```

Com a API rodando em paralelo (`cd server && npm run dev`).

### Telas e rotas do bloco 2

| Rota | Quem | Descrição |
|---|---|---|
| `/` | público | Tela inicial |
| `/cadastro` | público | Cadastro de paciente (CPF validado, máscaras, consentimento LGPD) |
| `/entrar` | público | Login (`?perfil=medico` mostra a versão da área do médico) |
| `/esqueci-senha` · `/definir-senha` | público | Recuperação de senha e destino do convite de médicos |
| `/paciente` | paciente | Próximas consultas, histórico, cancelamento |
| `/paciente/perfil` | paciente | Edita nome/telefone e troca a senha |
| `/agendar` | paciente | Reservada para o fluxo do bloco 3 |
| `/medico` · `/admin` | médico · admin | Páginas provisórias (painéis nos blocos 4 e 5) |

Para trocar o nome da clínica: `client/src/config/brand.js`.

## 4. Testes

Com a API rodando (`npm run dev`), em outro terminal:

```bash
cd server
npm run test:rls
```

Cria pacientes e médicos temporários no seu projeto, testa isolamento, a listagem de consultas do paciente e o bloqueio de edição de CPF/e-mail, bloqueio de cadastro de médicos, agendamento, concorrência e cancelamento, e apaga tudo no final.

Para incluir os testes do administrador, adicione ao `.env`: `TEST_ADMIN_EMAIL` e `TEST_ADMIN_PASSWORD` (sua conta de admin). Opcionalmente `TEST_INVITE_EMAIL` (um e-mail seu) para testar o convite real; use um e-mail que ainda não tenha conta.

### Teste manual com curl

```bash
# 1) token do admin
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"anthonymendesbiffi@gmail.com","password":"SUA_SENHA"}'
# copie "access_token" e use abaixo
curl -s http://localhost:3333/api/admin/doctors -H "Authorization: Bearer $TOKEN"
```

Repita com o token de um paciente: deve responder `403`.

## Pontos de atenção

- `ADMIN_EMAIL` no `.env` e `public.admin_email()` no SQL precisam ser iguais. Se trocar o admin, altere os dois.
- Mantenha **Confirm email** ligado: é o que impede alguém de se cadastrar com o e-mail de um médico pré-cadastrado ou do admin antes da confirmação.
- Médico desativado deixa de aparecer para novos agendamentos, mas mantém o login e o histórico.
- A troca da agenda semanal (`PUT .../schedules`) é feita em duas operações (upsert + remoção), não em uma transação única.
- A migração 002 trava no banco a edição de CPF, e-mail e data de nascimento pelo paciente (só nome e telefone).
- Mantenha só a chave `anon` no `client/.env`. A `service_role` nunca vai para o front-end.
