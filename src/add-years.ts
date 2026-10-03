export function dateAddYears(date: Date, years: number): Date {
  const result = new Date(date.getTime());

  // setFullYear re-reads the local time, which would move a time in the hour
  // repeated at the end of daylight saving onto its first occurrence
  if (years === 0) {
    return result;
  }

  result.setFullYear(date.getFullYear() + years);

  // 29 February in a year without one rolls over to 1 March, so step back to
  // 28 February
  if (result.getMonth() !== date.getMonth()) {
    result.setDate(0);
  }

  return result;
}
