export function dayNumber(value) {
  return String(value ? new Date(`${value}T12:00:00`).getDate() : '').padStart(2, '0');
}

export function monthShort(value) {
  return value
    ? new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${value}T12:00:00`))
    : '';
}

export function formatDateLong(value) {
  return value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(`${value}T12:00:00`))
    : '';
}

export function hhmm(value) {
  return value?.slice(0, 5) ?? '';
}

export function modalityLabel(value) {
  return value === 'online' ? 'Online' : 'Presencial';
}

export function isFutureAppointment(appointment) {
  return new Date(`${appointment.appointment_date}T${appointment.start_time}`) > new Date();
}
