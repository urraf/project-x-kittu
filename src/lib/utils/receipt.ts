/** Human-friendly receipt number shared by the receipt page and receipt emails, e.g. "KK-1A2B3C4D". */
export const receiptNumber = (id: string) => `KK-${id.slice(-8).toUpperCase()}`;
