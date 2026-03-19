import { MensalidadeService } from './mensalidade.service';

describe('MensalidadeService - evidence', () => {
  it('uploadEvidence atualiza vínculo retornado do storage', async () => {
    const repo = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    const fileStorageService = {
      uploadFileWithMetadata: jest.fn().mockResolvedValue({
        url: 'https://drive.google.com/file/d/abc/view',
        driveFileId: 'abc',
        driveFolderId: 'folder-1',
        webViewLink: 'https://drive.google.com/file/d/abc/view',
      }),
      checkEvidenceReference: jest.fn(),
    };

    const service = new MensalidadeService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      fileStorageService as never,
    );

    const mensalidade = {
      id: 'm-1',
      nucleoId: 'n-1',
      data_pagamento: new Date('2026-03-05'),
    };

    jest.spyOn(service, 'findOne').mockResolvedValue(mensalidade as never);
    const updateSpy = jest
      .spyOn(service, 'update')
      .mockResolvedValue({
        ...mensalidade,
        evidenciaDriveFileId: 'abc',
      } as never);

    await service.uploadEvidence('m-1', {
      buffer: Buffer.from('file-content'),
      originalname: 'comprovante.pdf',
      mimetype: 'application/pdf',
    });

    expect(fileStorageService.uploadFileWithMetadata).toHaveBeenCalledWith(
      expect.any(Buffer),
      'comprovante.pdf',
      'application/pdf',
      'n-1',
      {
        tipo: 'RECEITA',
        dataMovimento: mensalidade.data_pagamento,
        domain: 'mensalidade',
      },
    );
    expect(updateSpy).toHaveBeenCalledWith('m-1', {
      evidenciaDriveFileId: 'abc',
      evidenciaDriveFolderId: 'folder-1',
      evidenciaWebViewLink: 'https://drive.google.com/file/d/abc/view',
    });
  });

  it('clearEvidence remove todos os campos de evidência', async () => {
    const repo = {
      update: jest.fn().mockResolvedValue(undefined),
    };

    const service = new MensalidadeService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const mensalidade = { id: 'm-2' };
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(mensalidade as never)
      .mockResolvedValueOnce(mensalidade as never);

    await service.clearEvidence('m-2');

    expect(repo.update).toHaveBeenCalledWith('m-2', {
      evidenciaDriveFileId: null,
      evidenciaDriveFolderId: null,
      evidenciaWebViewLink: null,
    });
  });
});
