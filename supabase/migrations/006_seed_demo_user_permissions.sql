-- Server-only privileges for creating demo doctor records before Auth users.
-- Never expose the service_role key to the client.
grant insert on public.doctors, public.doctor_schedules to service_role;
