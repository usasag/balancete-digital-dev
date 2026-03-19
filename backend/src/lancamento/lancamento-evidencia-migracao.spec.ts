import { LancamentoService } from './lancamento.service';

describe('LancamentoService - migracao de evidencias', () => {
  it('valida linhas de preview da migracao', () => {
    const service = new LancamentoService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const parsed = service.parseEvidenceMigrationPreview([
      {
        entidade: 'LANCAMENTO',
        id: 'id-1',
        url: 'https://drive.google.com/file/d/ok/view',
      },
      {
        entidade: 'X',
        id: '',
        url: '',
      },
    ]);

    expect(parsed.validRows).toHaveLength(1);
    expect(parsed.validRows[0]).toEqual({
      linha: 2,
      entidade: 'LANCAMENTO',
      id: 'id-1',
      url: 'https://drive.google.com/file/d/ok/view',
    });
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors[0].linha).toBe(3);
  });
});
