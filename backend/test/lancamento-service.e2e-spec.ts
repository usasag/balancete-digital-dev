import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { LancamentoService } from '../src/lancamento/lancamento.service';
import { AuthGuard } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { Nucleo } from '../src/nucleo/nucleo.entity';
import { Usuario } from '../src/usuario/usuario.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LancamentoFinanceiro } from '../src/lancamento/lancamento.entity';
import { Role } from '../src/common/enums/role.enum'; // Ensure Role enum is imported or used correctly

// Interfaces for Test Data
interface MockUserData {
  email: string;
  nomeCompleto: string;
  uid: string;
  role: Role; // Strict Role type
}

interface MockNucleoData {
  nome: string;
}

describe('LancamentoService (Integration)', () => {
  let app: INestApplication;
  let lancamentoService: LancamentoService;
  let nucleoRepo: Repository<Nucleo>;
  let usuarioRepo: Repository<Usuario>;

  // Shared state for the suite
  let testNucleo: Nucleo;
  let testUsuario: Usuario;

  const uniqueId = Date.now();
  const mockNucleoData: MockNucleoData = {
    nome: `Nucleo Lancamento ${uniqueId}`,
  };

  const mockUserData: MockUserData = {
    email: `tesoureiro_lanc_${uniqueId}@test.com`,
    nomeCompleto: 'Tesoureiro Teste',
    uid: `uid_lanc_${uniqueId}`,
    role: Role.TESOURARIA,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard('firebase-jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    lancamentoService = moduleFixture.get<LancamentoService>(LancamentoService);
    nucleoRepo = moduleFixture.get<Repository<Nucleo>>(
      getRepositoryToken(Nucleo),
    );
    usuarioRepo = moduleFixture.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );

    // Setup Initial Data strictly
    const nucleoEntity = nucleoRepo.create(mockNucleoData);
    testNucleo = await nucleoRepo.save(nucleoEntity);

    const usuarioEntity = usuarioRepo.create({
      ...mockUserData,
      nucleo: testNucleo,
    });
    testUsuario = await usuarioRepo.save(usuarioEntity);
  });

  afterAll(async () => {
    // Optional: Cleanup if needed, but integration tests usually rely on dedicated DB or truncation
    await app.close();
  });

  it('should create a lancamento linked to a nucleo', async () => {
    if (!testNucleo || !testUsuario)
      throw new Error('Setup failed: Nucleo or Usuario is undefined');

    const inputData: Partial<LancamentoFinanceiro> = {
      tipo: 'DESPESA',
      descricao: 'Compra de Suprimentos',
      valor: 150.5,
      data_movimento: new Date(),
      nucleoId: testNucleo.id,
      criadoPorId: testUsuario.id,
      nucleo: testNucleo,
      criadoPor: testUsuario,
    };

    const created = await lancamentoService.create(inputData);

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(Number(created.valor)).toBeCloseTo(150.5);
    expect(created.nucleo).toBeDefined();
    expect(created.nucleo.id).toBe(testNucleo.id);
  });

  it('should list lancamentos by nucleo', async () => {
    if (!testNucleo) throw new Error('Setup failed: Nucleo is undefined');

    const list = await lancamentoService.findAllByNucleo(testNucleo.id);

    expect(list.length).toBeGreaterThan(0);
    const found = list.find((l) => l.descricao === 'Compra de Suprimentos');
    expect(found).toBeDefined();
    expect(found?.nucleo).toBeDefined(); // Ensure relation is loaded
    expect(found?.nucleo.id).toBe(testNucleo.id);
  });

  it('should remove a lancamento', async () => {
    if (!testNucleo) throw new Error('Setup failed: Nucleo is undefined');

    // Get current list
    const list = await lancamentoService.findAllByNucleo(testNucleo.id);
    expect(list.length).toBeGreaterThan(0);

    const itemToRemove = list[0];
    await lancamentoService.remove(itemToRemove.id);

    // Verify removal
    const listAfter = await lancamentoService.findAllByNucleo(testNucleo.id);
    expect(listAfter.find((l) => l.id === itemToRemove.id)).toBeUndefined();
  });
});
