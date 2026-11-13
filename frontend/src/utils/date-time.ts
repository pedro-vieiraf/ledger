/**
 * Helpers para converter datas/horas entre os formatos usados na interface
 * e objetos `Date` no fuso local do aparelho.
 *
 * Sempre use fuso local: o backend recebe ISO (`Instant`) e o frontend
 * exibe e edita horários no horário local do usuário.
 */

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * Divide um timestamp ISO em partes de exibição: `DD/MM/AAAA` e `HH:mm`.
 */
export function getLocalDateTimeParts(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }

  return {
    date: formatDateParts(date),
    time: formatTimeParts(date),
  };
}

/** Formata a parte de data como `DD/MM/AAAA`. */
export function formatDateParts(date: Date) {
  return (
      `${padNumber(date.getDate())}/` +
      `${padNumber(date.getMonth() + 1)}/` +
      `${date.getFullYear()}`
  );
}

/** Formata a parte de hora como `HH:mm`. */
export function formatTimeParts(date: Date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

/**
 * Converte `DD/MM/AAAA` e `HH:mm` em uma data no fuso local.
 * Retorna null para formatos inválidos ou datas inexistentes (ex.: 31/02).
 */
export function parseLocalDateTime(
    dateValue: string,
    timeValue: string,
): Date | null {
  const dateMatch =
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

  // Rejeita datas que "rolam", como 31/02 virando 03/03.
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }

  return parsed;
}

/** Compara duas datas ignorando segundos e milissegundos. */
export function isSameLocalMinute(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate() &&
    left.getHours() === right.getHours() &&
    left.getMinutes() === right.getMinutes()
  );
}

/**
 * Converte `DD/MM/AAAA` em uma data local. Retorna null para formatos
 * inválidos ou datas inexistentes (ex.: 31/02).
 */
export function parseLocalDate(dateValue: string): Date | null {
  return parseLocalDateTime(dateValue, '00:00');
}

/** Formata uma data local como `AAAA-MM-DD`, formato aceito pela API. */
export function toIsoDate(date: Date): string {
  return (
      `${date.getFullYear()}-` +
      `${padNumber(date.getMonth() + 1)}-` +
      `${padNumber(date.getDate())}`
  );
}

/** Formata uma data ISO (`AAAA-MM-DD`) como `DD/MM/AAAA`. */
export function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return formatDateParts(new Date(year, month - 1, day, 12));
}
