/** Shared filter options for the opportunity finder (homepage search + /opportunities). */

export const OPPORTUNITY_TYPES = [
  { id: "internship", label: "Internship" },
  { id: "scholarship", label: "Scholarship" },
  { id: "fellowship", label: "Fellowship" },
  { id: "research", label: "Research program" },
  { id: "exchange", label: "Exchange program" },
  { id: "summer-school", label: "Summer school" },
  { id: "conference", label: "Conference" },
  { id: "competition", label: "Competition" },
  { id: "job", label: "Job" },
] as const;

export const FUNDING_TYPES = [
  { id: "fully-funded", label: "Fully funded" },
  { id: "partially-funded", label: "Partially funded" },
  { id: "stipend", label: "Paid / stipend" },
  { id: "self-funded", label: "Self-funded" },
] as const;

export const DEADLINE_FILTERS = [
  { id: "7", label: "Closing in 7 days" },
  { id: "30", label: "Within 30 days" },
  { id: "90", label: "Within 3 months" },
  { id: "rolling", label: "Rolling / open" },
] as const;

/** Japan first (this is a Japan platform), then other popular destinations. */
export const COUNTRIES = [
  "Japan",
  "South Korea",
  "Taiwan",
  "Singapore",
  "China",
  "Germany",
  "France",
  "Netherlands",
  "Switzerland",
  "United Kingdom",
  "Europe (multiple)",
  "United States",
  "Canada",
  "Australia",
  "Worldwide / online",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]["id"];
export type FundingType = (typeof FUNDING_TYPES)[number]["id"];

export const typeLabel = (id: string) => OPPORTUNITY_TYPES.find((t) => t.id === id)?.label ?? id;
export const fundingLabel = (id: string) => FUNDING_TYPES.find((t) => t.id === id)?.label ?? id;

export const DEGREE_LEVELS = [
  { id: "high-school", label: "High school" },
  { id: "bachelor", label: "Bachelor's" },
  { id: "master", label: "Master's" },
  { id: "phd", label: "PhD" },
  { id: "graduate", label: "Recent graduates" },
  { id: "professional", label: "Professionals" },
] as const;

export const degreeLabel = (id: string) => DEGREE_LEVELS.find((d) => d.id === id)?.label ?? id;

