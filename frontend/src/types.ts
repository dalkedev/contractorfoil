export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface AuthSession extends User {
  token: string;
}

export interface Contractor {
  _id: string;
  name: string;
  phone: string;
  nip: string;
  address: string;
  contactDate?: string | null;
  notes?: string;
  priceColorless?: number | null;
  priceColor?: number | null;
  typeUnknown?: string;
  priceUnknown?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ContractorInput = Omit<Contractor, '_id' | 'createdAt' | 'updatedAt'>;
export type ContractorPatch = Partial<ContractorInput> & { _id?: string };
export type FieldErrors = Record<string, string>;
