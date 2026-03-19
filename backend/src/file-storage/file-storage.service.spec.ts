import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService - evidence health', () => {
  it('retorna MISSING quando sem referência', async () => {
    const config = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'FILE_STORAGE_TEST_MODE') return 'true';
        return def;
      }),
    } as unknown as ConfigService;

    const service = new FileStorageService(config);
    const result = await service.checkEvidenceReference({});

    expect(result.status).toBe('MISSING');
  });

  it('retorna UNKNOWN para URL externa sem drive id', async () => {
    const config = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'FILE_STORAGE_TEST_MODE') return 'true';
        return def;
      }),
    } as unknown as ConfigService;

    const service = new FileStorageService(config);
    const result = await service.checkEvidenceReference({
      url: 'https://example.com/comprovante.pdf',
    });

    expect(result.status).toBe('UNKNOWN');
  });
});
