import { describe, expect, it } from 'vitest';
import type { Contractor } from '../types';
import { buildContractorInput, buildContractorPatch, createContractorDraft, filterAndSortContractors, formatContactDate, formatPrice } from './contractors';

const legacy: Contractor = {
  _id: 'legacy-1', name: 'River Reuse', phone: '+48 012 345 678', nip: '0123456789', address: '12 Fictional Road',
  priceColorless: 0, priceColor: 8.123456789, priceUnknown: 3.25, contactDate: '2024-03-31T12:30:00.000Z',
  createdAt: '2024-01-01T10:00:00.000Z', updatedAt: '2024-04-01T10:00:00.000Z',
};
const minimal: Contractor = { _id: 'minimal-1', name: 'Amber Materials', phone: '01234', nip: '0000123456', address: '8 Fictional Street' };
const filledDraft = { name: 'New Reuse', phone: '+48 012 345 678', nip: '0123456789', address: '12 Fictional Road', notes: '', typeUnknown: '', priceColorless: '', priceColor: '', priceUnknown: '', contactDate: '' };

describe('contractor drafts', () => {
  it('starts a new form empty without inventing optional values', () => {
    expect(createContractorDraft()).toEqual({ name: '', phone: '', nip: '', address: '', notes: '', typeUnknown: '', priceColorless: '', priceColor: '', priceUnknown: '', contactDate: '' });
  });

  it('keeps zero, full numeric precision, identifiers and the UTC calendar date editable', () => {
    expect(createContractorDraft(legacy)).toEqual({ name: 'River Reuse', phone: '+48 012 345 678', nip: '0123456789', address: '12 Fictional Road', notes: '', typeUnknown: '', priceColorless: '0', priceColor: '8.123456789', priceUnknown: '3.25', contactDate: '2024-03-31' });
  });

  it('creates a sparse payload without turning blank optional values into zero or null', () => {
    expect(buildContractorInput(filledDraft)).toEqual({ name: 'New Reuse', phone: '+48 012 345 678', nip: '0123456789', address: '12 Fictional Road' });
  });

  it('creates zero and decimal prices with a newly selected date encoded at UTC midnight', () => {
    expect(buildContractorInput({ ...filledDraft, priceColorless: '0', priceColor: '8.123456789', contactDate: '2024-03-31' })).toEqual({ name: 'New Reuse', phone: '+48 012 345 678', nip: '0123456789', address: '12 Fictional Road', priceColorless: 0, priceColor: 8.123456789, contactDate: '2024-03-31T00:00:00.000Z' });
  });

  it('produces only notes for an unrelated legacy edit', () => {
    const draft = { ...createContractorDraft(legacy), notes: 'Call reception before arrival.' };
    expect(buildContractorPatch(legacy, draft)).toEqual({ notes: 'Call reception before arrival.' });
  });

  it('preserves absent optional values on a notes-only edit', () => {
    expect(buildContractorPatch(minimal, { ...createContractorDraft(minimal), notes: 'New note' })).toEqual({ notes: 'New note' });
  });

  it('represents explicitly cleared prices and dates as null', () => {
    expect(buildContractorPatch(legacy, { ...createContractorDraft(legacy), priceColorless: '', priceUnknown: '', contactDate: '' })).toEqual({ priceColorless: null, priceUnknown: null, contactDate: null });
  });

  it('omits untouched null values and returns an empty no-op patch', () => {
    const record = { ...minimal, priceColor: null, contactDate: null };
    expect(buildContractorPatch(record, createContractorDraft(record))).toEqual({});
  });

  it('keeps clearing optional text distinct from not changing it', () => {
    const record = { ...minimal, notes: 'Old note', typeUnknown: 'Mixed' };
    expect(buildContractorPatch(record, { ...createContractorDraft(record), notes: '', typeUnknown: '' })).toEqual({ notes: '', typeUnknown: '' });
  });

  it('does not round a high precision price after the user changes its numeric value', () => {
    expect(buildContractorPatch(legacy, { ...createContractorDraft(legacy), priceColor: '9.987654321' })).toEqual({ priceColor: 9.987654321 });
  });

  it.each(['Infinity', 'NaN', '8abc', '0x10'])('rejects a non-decimal price %s without producing a payload', (value) => {
    expect(() => buildContractorInput({ ...filledDraft, priceColor: value })).toThrowError(expect.objectContaining({ fields: { priceColor: expect.any(String) } }));
  });

  it('rejects an impossible calendar date instead of normalizing it to another day', () => {
    expect(() => buildContractorInput({ ...filledDraft, contactDate: '2024-02-30' })).toThrowError(expect.objectContaining({ fields: { contactDate: expect.any(String) } }));
  });

  it('rejects blank required fields with a field error', () => {
    expect(() => buildContractorInput({ ...filledDraft, name: '   ' })).toThrowError(expect.objectContaining({ fields: { name: expect.any(String) } }));
  });
});

describe('display and discovery', () => {
  it('distinguishes zero and missing prices while keeping the current PLN/kg unit', () => {
    expect(formatPrice(0)).toBe('0.00 PLN/kg');
    expect(formatPrice(8.123456789)).toBe('8.12 PLN/kg');
    expect(formatPrice(null)).toBe('Not set');
    expect(formatPrice(undefined)).toBe('Not set');
  });

  it('shows the neutral UTC calendar date, including DST days', () => {
    expect(formatContactDate('2024-03-31T12:30:00.000Z')).toBe('31 Mar 2024');
    expect(formatContactDate('2024-11-03T00:00:00.000Z')).toBe('03 Nov 2024');
    expect(formatContactDate(null)).toBe('Not set');
  });

  it('finds companies by case-insensitive company, NIP, phone, address and notes', () => {
    const records = [legacy, { ...minimal, notes: 'Rear gate' }];
    for (const query of ['RIVER', '0123456789', '+48', '12 Fictional Road']) {
      expect(filterAndSortContractors(records, { query }).map((item) => item._id)).toEqual(['legacy-1']);
    }
    expect(filterAndSortContractors(records, { query: 'rear GATE' }).map((item) => item._id)).toEqual(['minimal-1']);
  });

  it('sorts a copy without changing fetched records or losing the active query', () => {
    const records = [legacy, minimal];
    expect(filterAndSortContractors(records).map((item) => item._id)).toEqual(['minimal-1', 'legacy-1']);
    expect(records.map((item) => item._id)).toEqual(['legacy-1', 'minimal-1']);
    expect(filterAndSortContractors([...records, { ...minimal, _id: 'new-1', name: 'River Plastics' }], { query: 'river', sort: 'name-desc' }).map((item) => item._id)).toEqual(['legacy-1', 'new-1']);
  });

  it('keeps missing dates last for either neutral contact-date order', () => {
    const records = [minimal, legacy, { ...minimal, _id: 'dated-1', contactDate: '2024-01-01T00:00:00.000Z' }];
    expect(filterAndSortContractors(records, { sort: 'contact-asc' }).map((item) => item._id)).toEqual(['dated-1', 'legacy-1', 'minimal-1']);
    expect(filterAndSortContractors(records, { sort: 'contact-desc' }).map((item) => item._id)).toEqual(['legacy-1', 'dated-1', 'minimal-1']);
  });
});
