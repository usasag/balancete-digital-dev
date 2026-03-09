import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { BalanceteService } from '../src/balancete/balancete.service';
import { AppModule } from '../src/app.module';
import { Role } from '../src/common/enums/role.enum';
import { Repository } from 'typeorm';
import { Usuario } from '../src/usuario/usuario.entity';
import { Nucleo } from '../src/nucleo/nucleo.entity';
import { BalanceteStatus } from '../src/balancete/balancete.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Balancete Approval Flow (Integration)', () => {
  let app: INestApplication;
  let service: BalanceteService;
  let usuarioRepo: Repository<Usuario>;
  let nucleoRepo: Repository<Nucleo>;

  let nucleo: Nucleo;
  let tesouraria: Usuario;
  let conselho: Usuario;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = app.get<BalanceteService>(BalanceteService);
    usuarioRepo = app.get(getRepositoryToken(Usuario));
    nucleoRepo = app.get(getRepositoryToken(Nucleo));

    // Use Random Data

    const nucleoData = nucleoRepo.create({
      nome: `Nucleo Integration ${Date.now()}`,
      endereco: 'Rua Teste',
    });
    nucleo = await nucleoRepo.save(nucleoData);

    const tesourariaData = usuarioRepo.create({
      nomeCompleto: 'Tesoureiro',
      email: `tesouraria_${Date.now()}@int.com`,
      role: Role.TESOURARIA,
      nucleo,
    });
    tesouraria = await usuarioRepo.save(tesourariaData);

    const conselhoData = usuarioRepo.create({
      nomeCompleto: 'Conselheiro',
      email: `conselho_${Date.now()}@int.com`,
      role: Role.CONSELHO_FISCAL,
      nucleo,
    });
    conselho = await usuarioRepo.save(conselhoData);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should go from RASCUNHO to EM_APROVACAO when Tesouraria approves', async () => {
    // 1. Create Balancete
    const balancete = await service.create({ ano_mes: '2026-01' }, tesouraria);
    expect(balancete.status).toBe(BalanceteStatus.RASCUNHO);

    // 2. Tesouraria Approves
    const updated = await service.approve(balancete.id, tesouraria, 'APROVADO');

    // 3. Verify Status Change (Should be EM_APROVACAO because Conselh hasn't approved yet)
    expect(updated.status).toBe(BalanceteStatus.EM_APROVACAO);
  });
  it('should go to APROVADO when both approve', async () => {
    // Get existing
    const balancetes = await service.findAll(nucleo.id);
    const balancete = balancetes[0];

    // Conselho Approves
    const updated = await service.approve(balancete.id, conselho, 'APROVADO');

    // 4. Verify Final Status (Both Approved)
    expect(updated.status).toBe(BalanceteStatus.APROVADO);
  });
});
