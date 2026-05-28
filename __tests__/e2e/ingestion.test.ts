import { runChicagoIngestion } from '../../lib/adapters/chicago';

// Basic smoke test for the full ingestion pipeline
describe('End-to-End Ingestion Smoke Test', () => {
  it('should run Chicago ingestion without throwing', async () => {
    // This test only checks that the function runs and returns a result shape.
    // It does NOT hit real APIs when keys are missing.
    const result = await runChicagoIngestion(5);

    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('success');
    expect(typeof result.fetched).toBe('number');
  });
});