export function getKolkataDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dateString: string;
  monthString: string;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateString = formatter.format(date); // YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
    dateString,
    monthString: `${yearStr}-${monthStr}`,
  };
}

export function isSameKolkataDay(d1: Date, d2: Date = new Date()): boolean {
  const p1 = getKolkataDateParts(d1);
  const p2 = getKolkataDateParts(d2);
  return p1.dateString === p2.dateString;
}
