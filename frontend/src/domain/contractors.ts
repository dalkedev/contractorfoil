import type { Contractor, ContractorInput, ContractorPatch, FieldErrors } from '../types';

export interface ContractorDraft {
  name: string;
  phone: string;
  nip: string;
  address: string;
  contactDate: string;
  notes: string;
  priceColorless: string;
  priceColor: string;
  typeUnknown: string;
  priceUnknown: string;
}

export type ContractorSort = 'name-asc' | 'name-desc' | 'updated-desc' | 'contact-asc' | 'contact-desc';
export interface ContractorListOptions { query?: string; sort?: ContractorSort }

export class ContractorDraftError extends Error {
  readonly fields: FieldErrors;

  constructor(fields: FieldErrors) {
    super('Check the highlighted fields.');
    this.name = 'ContractorDraftError';
    this.fields = fields;
  }
}

const requiredFields = ['name', 'phone', 'nip', 'address'] as const;
const priceFields = ['priceColorless', 'priceColor', 'priceUnknown'] as const;
const textFields = ['notes', 'typeUnknown'] as const;
const draftFields = [...requiredFields, ...priceFields, ...textFields, 'contactDate'] as const;

export const createContractorDraft = (contractor?: Contractor): ContractorDraft => ({
  name: contractor?.name ?? '',
  phone: contractor?.phone ?? '',
  nip: contractor?.nip ?? '',
  address: contractor?.address ?? '',
  contactDate: contractor?.contactDate?.slice(0, 10) ?? '',
  notes: contractor?.notes ?? '',
  typeUnknown: contractor?.typeUnknown ?? '',
  priceColorless: contractor?.priceColorless == null ? '' : String(contractor.priceColorless),
  priceColor: contractor?.priceColor == null ? '' : String(contractor.priceColor),
  priceUnknown: contractor?.priceUnknown == null ? '' : String(contractor.priceUnknown),
});

function parsePrice(value: string): number | undefined {
  const decimal = value.trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(decimal)) return undefined;
  const number = Number(decimal);
  return Number.isFinite(number) ? number : undefined;
}

function parseDate(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
  return date.toISOString();
}

function buildValues(draft: ContractorDraft, original?: Contractor): ContractorPatch {
  const baseline = original ? createContractorDraft(original) : undefined;
  const result: Record<string, string | number | null> = {};
  const errors: FieldErrors = {};
  for (const field of draftFields) {
    const value = draft[field];
    if (baseline && value === baseline[field]) continue;
    if ((requiredFields as readonly string[]).includes(field)) {
      if (!value.trim()) errors[field] = 'This field is required.';
      else result[field] = value.trim();
    } else if ((priceFields as readonly string[]).includes(field)) {
      if (!value.trim()) {
        if (baseline) result[field] = null;
      } else {
        const parsed = parsePrice(value);
        if (parsed === undefined) errors[field] = 'Enter a finite decimal price.';
        else result[field] = parsed;
      }
    } else if (field === 'contactDate') {
      if (!value) {
        if (baseline) result[field] = null;
      } else {
        const parsed = parseDate(value);
        if (!parsed) errors[field] = 'Enter a valid calendar date.';
        else result[field] = parsed;
      }
    } else if (baseline || value) {
      result[field] = value;
    }
  }
  if (Object.keys(errors).length) throw new ContractorDraftError(errors);
  return result;
}

/** Empty optional fields are omitted on creation. Selected dates use UTC midnight. */
export const buildContractorInput = (draft: ContractorDraft): ContractorInput =>
  buildValues(draft) as ContractorInput;

/** Compare editable strings, keeping untouched legacy precision, timestamps and absence. */
export const buildContractorPatch = (original: Contractor, draft: ContractorDraft): ContractorPatch =>
  buildValues(draft, original);

export const formatPrice = (value?: number | null): string =>
  value == null || !Number.isFinite(value) ? 'Not set' : `${new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} PLN/kg`;

export const formatContactDate = (value?: string | null): string => {
  if (!value) return 'Not set';
  const parsed = parseDate(value.slice(0, 10));
  return parsed ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(parsed)) : 'Not set';
};

const searchText = (value: string): string => value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('en-GB');
const compareNames = (a: Contractor, b: Contractor): number => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });
const timestamp = (value?: string | null): number | null => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : null;
};

export function filterAndSortContractors(records: readonly Contractor[], { query = '', sort = 'name-asc' }: ContractorListOptions = {}): Contractor[] {
  const terms = searchText(query.trim()).split(/\s+/).filter(Boolean);
  const filtered = records.filter((record) => {
    const content = searchText([record.name, record.nip, record.phone, record.address, record.notes, record.typeUnknown].filter(Boolean).join(' '));
    return terms.every((term) => content.includes(term));
  });
  return filtered.sort((a, b) => {
    if (sort === 'name-asc' || sort === 'name-desc') return compareNames(a, b) * (sort === 'name-desc' ? -1 : 1);
    const aTime = timestamp(sort === 'updated-desc' ? a.updatedAt ?? a.createdAt : a.contactDate);
    const bTime = timestamp(sort === 'updated-desc' ? b.updatedAt ?? b.createdAt : b.contactDate);
    if (aTime === null && bTime !== null) return 1;
    if (bTime === null && aTime !== null) return -1;
    if (aTime === null || bTime === null || aTime === bTime) return compareNames(a, b);
    return (aTime - bTime) * (sort === 'contact-asc' ? 1 : -1);
  });
}
