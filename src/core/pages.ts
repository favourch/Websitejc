export type Page = {
  title: string;
  path: string;
};

export type Pages = {
  home: Page;
  products1: Page;
  products2: Page;
  products3: Page;
  membership: Page;
  about: Page;
  contact: Page;
  terms: Page;
  privacy: Page;
  memberForm: Page;
};

export const pages: Pages = {
  home: {
    title: "Home",
    path: "/",
  },
  products1: {
    title: "Health & Accident Insurance",
    path: "/health-accident",
  },
  products2: {
    title: "Life & Travel Insurance",
    path: "/life-travel",
  },
  products3: {
    title: "Business & Financial Products",
    path: "/business-financial",
  },
  membership: {
    title: "Membership",
    path: "/membership",
  },
  about: {
    title: "About",
    path: "/about",
  },
  contact: {
    title: "Contact",
    path: "/contact",
  },
  terms: {
    title: "Terms of Service",
    path: "/terms",
  },
  privacy: {
    title: "Privacy Policy",
    path: "/privacy",
  },
  memberForm: {
    title: "Become a Member",
    path: "/contact",
  },
};
