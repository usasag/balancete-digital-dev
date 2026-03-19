import { LancamentoService } from './lancamento.service';

describe('LancamentoService - evidence', () => {
  it('clearEvidence limpa campos e força RASCUNHO para despesa', async () => {
    const repo = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    const periodoService = {
      checkPermissao: jest.fn().mockResolvedValue(undefined),
    };

    const service = new LancamentoService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      periodoService as never,
    );

    const original = {
      id: 'l-1',
      tipo: 'DESPESA',
      status: 'REGISTRADO',
      data_movimento: new Date('2026-03-01'),
      nucleoId: 'n-1',
    };
    const expected = {
      ...original,
      status: 'RASCUNHO',
      comprovante_url: null,
      evidenciaDriveFileId: null,
      evidenciaDriveFolderId: null,
      evidenciaWebViewLink: null,
    };

    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(original as never)
      .mockResolvedValueOnce(expected as never);

    const result = await service.clearEvidence('l-1');

    expect(periodoService.checkPermissao).toHaveBeenCalledWith(
      original.data_movimento,
      original.nucleoId,
    );
    expect(repo.update).toHaveBeenCalledWith('l-1', {
      comprovante_url: null,
      evidenciaDriveFileId: null,
      evidenciaDriveFolderId: null,
      evidenciaWebViewLink: null,
      status: 'RASCUNHO',
    });
    expect(result.status).toBe('RASCUNHO');
  });
});
