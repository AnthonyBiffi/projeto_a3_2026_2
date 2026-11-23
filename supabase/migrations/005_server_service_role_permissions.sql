-- Minimal privileges required by the server's admin middleware and rollback.
-- The service_role key must remain server-side and must never be shipped to the client.
grant select on public.profiles to service_role;
grant delete on public.doctors to service_role;
