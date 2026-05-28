import { normalizeChicagoPermit, ChicagoRawPermit } from '../../lib/adapters/chicago';

describe('Chicago Adapter - normalizeChicagoPermit', () => {
  const mockRaw: ChicagoRawPermit = {
    id: '12345',
    permit_: 'B202312345',
    permit_type: 'ELECTRICAL',
    issue_date: '2023-12-01T00:00:00',
    street_number: '123',
    street_direction: 'N',
    street_name: 'Main',
    suffix: 'St',
    work_description: 'Install new outlets',
    zip_code: '60601',
    latitude: '41.8781',
    longitude: '-87.6298',
  };

  it('should normalize a raw Chicago permit correctly', () => {
    const result = normalizeChicagoPermit(mockRaw);

    expect(result.source).toBe('chicago');
    expect(result.source_id).toBe('12345');
    expect(result.permit_number).toBe('B202312345');
    expect(result.permit_type).toBe('electrical'); // normalized via mapper
    expect(result.address).toBe('123 N Main St');
    expect(result.city).toBe('Chicago');
    expect(result.state).toBe('IL');
    expect(result.issue_date).toBe('2023-12-01');
    expect(result.latitude).toBe(41.8781);
    expect(result.longitude).toBe(-87.6298);
    expect(result.description).toBe('Install new outlets');
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalRaw: ChicagoRawPermit = {
      id: '999',
      permit_: '',
      permit_type: 'BUILDING',
      street_number: '456',
      street_name: 'Oak',
    };

    const result = normalizeChicagoPermit(minimalRaw);

    expect(result.permit_number).toBeUndefined();
    expect(result.permit_type).toBe('building');
    expect(result.address).toBe('456 Oak');
    expect(result.zip).toBeUndefined();
  });
});