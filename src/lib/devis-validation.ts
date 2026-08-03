export const MIN_QUOTE_DESCRIPTION_LENGTH = 100;

export function validateProQuote(data: {
  visitDate: string;
  amount: number;
  description: string;
}): string | null {
  if (!data.visitDate) {
    return "Indiquez la date de visite sur le chantier.";
  }

  const visit = new Date(data.visitDate);
  if (Number.isNaN(visit.getTime())) {
    return "Date de visite invalide.";
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (visit > today) {
    return "La visite doit avoir eu lieu (date passée ou aujourd'hui).";
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return "Montant du devis invalide.";
  }

  const desc = data.description.trim();
  if (desc.length < MIN_QUOTE_DESCRIPTION_LENGTH) {
    return `Le détail du devis doit contenir au moins ${MIN_QUOTE_DESCRIPTION_LENGTH} caractères (prestations, matériaux, délais…).`;
  }

  return null;
}
