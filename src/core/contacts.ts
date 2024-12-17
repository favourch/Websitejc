export type Contact = {
  title: string;
  path: string;
};

export type Address = {
  street: string;
  city: string;
  state: string;
  zipcode: string;
};

export type Contacts = {
  address: Address;
  email: Contact;
  phone: Contact;
};

export const contacts: Contacts = {
  address: {
    street: "1201 S Main Street Ste 204",
    city: "Boerne",
    state: "TX",
    zipcode: "78006",
  },
  email: {
    title: "info@wholesalersadvantage.com",
    path: "mailto:info@wholesalersadvantage.com",
  },
  phone: {
    title: "+1 (555) 555 5555",
    path: "tel:15555555555",
  },
};
