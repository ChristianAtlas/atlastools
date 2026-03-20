// Stripe product & price mappings for AtlasOne billing tiers
export const BILLING_TIERS = {
  peo_basic: {
    name: "PEO Basic",
    slug: "peo_basic",
    pricePerEmployee: 80,
    perEmployee: true,
    stripeProductId: "prod_UBWuz5ll2tNCRg",
    stripePriceId: "price_1TD9qxC0qITs09HcRfFZWLGv",
    isAddon: false,
  },
  peo_extra: {
    name: "PEO Extra",
    slug: "peo_extra",
    pricePerEmployee: 110,
    perEmployee: true,
    stripeProductId: "prod_UBWwNT5fhLili5",
    stripePriceId: "price_1TD9sJC0qITs09Hco2TP8ilR",
    isAddon: false,
  },
  monthly_service: {
    name: "Monthly Service Charge",
    slug: "monthly_service",
    pricePerEmployee: 65,
    perEmployee: false,
    stripeProductId: "prod_UBWwGYigBP0Zdr",
    stripePriceId: "price_1TD9sgC0qITs09Hcd9tumjnI",
    isAddon: false,
  },
  time_tracking: {
    name: "Atlas Time Tracking",
    slug: "time_tracking",
    pricePerEmployee: 8,
    perEmployee: true,
    stripeProductId: "prod_UBWwXIGYzYic1w",
    stripePriceId: "price_1TD9snC0qITs09HcpQYhmbK4",
    isAddon: true,
  },
  contractors: {
    name: "Contractors",
    slug: "contractors",
    pricePerEmployee: 39,
    perEmployee: true,
    stripeProductId: "prod_UBWwgTkTb4tsjj",
    stripePriceId: "price_1TD9soC0qITs09HcRQkK8S2r",
    isAddon: true,
  },
  hr_consulting: {
    name: "Dedicated HR Consulting",
    slug: "hr_consulting",
    pricePerEmployee: 30,
    perEmployee: true,
    stripeProductId: "prod_UBWwccxOLt2DZj",
    stripePriceId: "price_1TD9spC0qITs09HcGT99yK5v",
    isAddon: true,
  },
} as const;

export const PAYROLL_MARKUPS = {
  general: { label: "General Markup", rate: 0.015 },
  sui: { label: "SUI Markup", rate: 0.025 },
} as const;

export type BillingTierSlug = keyof typeof BILLING_TIERS;
