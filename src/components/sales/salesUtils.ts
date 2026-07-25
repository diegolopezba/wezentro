export const formatBs = (n: number | null | undefined) =>
  `Bs. ${Math.round(Number(n) || 0).toLocaleString("es-BO")}`;

export const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export const formatMonth = (iso: string) => {
  const d = new Date(iso);
  return `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};
