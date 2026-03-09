import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { MensalidadeService } from '../src/mensalidade/mensalidade.service';
import { AuthGuard } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { Nucleo } from '../src/nucleo/nucleo.entity';
import { Usuario } from '../src/usuario/usuario.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../src/common/enums/role.enum';

describe('MensalidadeService (Integration)', () => {
  let app: INestApplication;
  let mensalidadeService: MensalidadeService;
  let nucleoRepo: Repository<Nucleo>;
  let usuarioRepo: Repository<Usuario>;

  let testNucleo: Nucleo;
  let testSocio: Usuario;

  const uniqueId = Date.now();
  const mockNucleoName = `Nucleo Mensalidade ${uniqueId}`;
  const mockUserEmail = `socio_msg_${uniqueId}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard('firebase-jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mensalidadeService =
      moduleFixture.get<MensalidadeService>(MensalidadeService);
    nucleoRepo = moduleFixture.get(getRepositoryToken(Nucleo));
    usuarioRepo = moduleFixture.get(getRepositoryToken(Usuario));

    // Setup Data
    testNucleo = await nucleoRepo.save(
      nucleoRepo.create({ nome: mockNucleoName }),
    );
    testSocio = await usuarioRepo.save(
      usuarioRepo.create({
        nomeCompleto: 'Socio Teste',
        email: mockUserEmail,
        role: Role.SOCIO,
        firebaseUid: `uid_msg_${uniqueId}`,
        nucleo: testNucleo,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a mensalidade for a socio', async () => {
    const input = {
      socio: testSocio,
      socioId: testSocio.id,
      nucleo: testNucleo,
      nucleoId: testNucleo.id,
      valor: 50.0,
      mes_referencia: '01/2026',
      status: 'PENDENTE',
    };

    const created = await mensalidadeService.create(input);
    expect(created).toBeDefined();
    expect(Number(created.valor)).toBeCloseTo(50.0);
    expect(created.status).toBe('PENDENTE');
    expect(created.socioId).toBe(testSocio.id);
  });

  it('should list mensalidades by socio', async () => {
    const list = await mensalidadeService.findAllBySocio(testSocio.id);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].mes_referencia).toBe('01/2026');
  });

  it('should update status to PAGO', async () => {
    const list = await mensalidadeService.findAllBySocio(testSocio.id);
    const target = list[0];

    const updated = await mensalidadeService.update(target.id, {
      status: 'PAGO',
      data_pagamento: new Date(),
    });

    expect(updated.status).toBe('PAGO');
    expect(updated.data_pagamento).toBeDefined();
  });
});
