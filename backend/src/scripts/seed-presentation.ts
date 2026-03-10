import { DataSource } from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';
import { Usuario } from '../usuario/usuario.entity';
import { BalanceteMensal } from '../balancete/balancete.entity';
import { LancamentoFinanceiro } from '../lancamento/lancamento.entity';
import * as dotenv from 'dotenv';
import { BalanceteAprovacao } from '../balancete/balancete-aprovacao.entity';
import { Role } from '../common/enums/role.enum';
import { Caixa } from '../caixa/caixa.entity';
import { ContaBancaria } from '../conta-bancaria/conta-bancaria.entity';
import { Taxa } from '../taxa/taxa.entity';
import { Mensalidade } from '../mensalidade/mensalidade.entity';
import { ConfiguracaoFinanceira } from '../configuracao/configuracao.entity';
import { Periodo, PeriodoStatus } from '../periodo/periodo.entity';
import { BalanceteStatus } from '../balancete/balancete.entity';
import { UsuarioTaxa } from '../usuario-taxa/usuario-taxa.entity';
import { Grau } from '../common/enums/grau.enum';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'adminpassword',
  database: process.env.DATABASE_NAME || 'balancete_digital',
  entities: [
    Nucleo,
    Usuario,
    BalanceteMensal,
    LancamentoFinanceiro,
    BalanceteAprovacao,
    Caixa,
    ContaBancaria,
    Taxa,
    Mensalidade,
    ConfiguracaoFinanceira,
    UsuarioTaxa,
    Periodo,
  ],
  synchronize: true,
  dropSchema: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Database connected & Schema dropped/recreated.');

  const nucleoRepo = dataSource.getRepository(Nucleo);
  const userRepo = dataSource.getRepository(Usuario);
  const lancamentoRepo = dataSource.getRepository(LancamentoFinanceiro);
  const caixaRepo = dataSource.getRepository(Caixa);
  const contaRepo = dataSource.getRepository(ContaBancaria);
  const taxaRepo = dataSource.getRepository(Taxa);
  const mensalidadeRepo = dataSource.getRepository(Mensalidade);
  const configRepo = dataSource.getRepository(ConfiguracaoFinanceira);
  const periodoRepo = dataSource.getRepository(Periodo);
  const balanceteRepo = dataSource.getRepository(BalanceteMensal);

  // ... (Nucleo, Caixas, Taxas, Config setup remains same up to Period logic)
  // ... Re-pasting the unchanged top part for context in replace isn't ideal for large file.
  // I will target specific blocks.

  // 1. Nucleo
  const nucleo = await nucleoRepo.save(
    nucleoRepo.create({ nome: 'Núcleo Linha de Tucunacá' }),
  );
  console.log('Nucleo created.');

  // 2. Caixas & Contas
  const contaBb = await contaRepo.save(
    contaRepo.create({
      nome_conta: 'Conta Principal BB',
      banco: 'Banco do Brasil',
      agencia: '1234-5',
      numero_conta: '99999-9',
      nucleo,
    }),
  );

  const tesouraria = await caixaRepo.save(
    caixaRepo.create({
      nome: 'Tesouraria',
      nucleo,
      saldoInicial: 0,
      distribuicaoInicial: {
        dinheiro: 0,
        outros: 0,
        contas: { [contaBb.id]: 0 },
      },
    }),
  );

  const caixaObras = await caixaRepo.save(
    caixaRepo.create({
      nome: 'Fundos de Obras',
      nucleo,
      saldoInicial: 0,
      distribuicaoInicial: {
        dinheiro: 0,
        outros: 0,
        contas: {},
      },
    }),
  );

  console.log('Caixas created.');

  // 3. Taxas
  await taxaRepo.save(
    taxaRepo.create({
      nome: 'Mensalidade',
      descricao: 'Mensalidade regular',
      valor: 180.0,
      ativa: true,
      opcional: false,
      nucleo,
      caixa: tesouraria,
    }),
  );

  await taxaRepo.save(
    taxaRepo.create({
      nome: 'Taxa de Obras',
      descricao: 'Manutenção do templo',
      valor: 50.0,
      ativa: true,
      opcional: true,
      nucleo,
      caixa: caixaObras,
    }),
  );

  console.log('Taxas created.');

  // 4. Configuration
  await configRepo.save(
    configRepo.create({
      nucleo,
      valor_repasse_dg: 24.57,
      valor_repasse_regiao: 12.0,
      caixaDg: tesouraria,
      caixaRegiao: tesouraria,
      caixaNucleo: tesouraria,
    }),
  );
  console.log('Configuracao created.');

  // 5. Users (100 users)
  const users: Usuario[] = [];

  // Helper names
  const firstNames = [
    'Ana',
    'Bruno',
    'Carlos',
    'Daniela',
    'Eduardo',
    'Fernanda',
    'Gabriel',
    'Helena',
    'Igor',
    'Julia',
    'Lucas',
    'Mariana',
    'Nicolas',
    'Olivia',
    'Pedro',
    'Rafaela',
    'Samuel',
    'Tatiana',
    'Vinicius',
    'Yasmin',
  ];
  const lastNames = [
    'Silva',
    'Santos',
    'Oliveira',
    'Souza',
    'Rodrigues',
    'Ferreira',
    'Alves',
    'Pereira',
    'Lima',
    'Gomes',
    'Costa',
    'Ribeiro',
    'Martins',
    'Carvalho',
    'Almeida',
  ];

  const generateName = (i: number) => {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[i % lastNames.length];
    return `${first} ${last} ${i}`; // Append index to ensure uniqueness if list loops
  };

  // Special Roles
  const specialUsers = [
    {
      name: 'Presidente Vitor',
      email: 'vitorbispobsb@gmail.com',
      role: Role.PRESIDENCIA,
      grau: Grau.Q_MESTRES,
    },
    {
      name: 'Tesoureiro Vitor',
      email: 'vitorbrauna22@gmail.com',
      role: Role.TESOURARIA,
      grau: Grau.C_CONSELHO,
    },
    {
      name: 'Conselho Vitor',
      email: 'vitor.brauna22@gmail.com',
      role: Role.CONSELHO_FISCAL,
      grau: Grau.C_INSTRUTIVO,
    },
    {
      name: 'Contabilidade',
      email: 'contabilidade@example.com',
      role: Role.CONTABILIDADE_UNICA,
      grau: Grau.C_CONSELHO,
    },
  ];

  const grausDisponiveis = [
    Grau.Q_SOCIOS,
    Grau.C_INSTRUTIVO,
    Grau.C_CONSELHO,
    Grau.Q_MESTRES,
  ];

  for (const sp of specialUsers) {
    const u = new Usuario();
    u.nomeCompleto = sp.name;
    u.email = sp.email;
    u.role = sp.role;
    u.grau = sp.grau;
    u.nucleo = nucleo;
    u.valor_base = 180.0; // Standard for admins
    u.firebaseUid = `uid_${sp.email}`;
    users.push(await userRepo.save(u));
  }

  // Generate remaining users to reach 100
  for (let i = users.length; i < 100; i++) {
    const u = new Usuario();
    u.nomeCompleto = generateName(i);
    u.email = `user${i}@example.com`;
    u.role = Role.SOCIO;
    u.grau =
      grausDisponiveis[Math.floor(Math.random() * grausDisponiveis.length)];
    u.nucleo = nucleo;

    // Random Base between 90 and 300 with decimals
    const randomBase = (Math.random() * (300 - 90) + 90).toFixed(2);
    u.valor_base = parseFloat(randomBase);
    u.firebaseUid = `uid_${u.email}`;

    // Tag Logic
    if (i === 98) {
      u.tags = ['Sujeito a Pena Social'];
    } else if (i === 99) {
      u.tags = ['Pena Social'];
    }

    users.push(await userRepo.save(u));
  }
  console.log(`Created ${users.length} users.`);

  // 6. Periods & Balancetes
  const timeline = [
    {
      label: 'Outubro 2025',
      date: '2025-10-01',
      ref: '10/2025',
      status: PeriodoStatus.ABERTO,
    },
    {
      label: 'Novembro 2025',
      date: '2025-11-01',
      ref: '11/2025',
      status: PeriodoStatus.ABERTO,
    },
    {
      label: 'Dezembro 2025',
      date: '2025-12-01',
      ref: '12/2025',
      status: PeriodoStatus.ABERTO,
    },
    {
      label: 'Janeiro 2026',
      date: '2026-01-01',
      ref: '01/2026',
      status: PeriodoStatus.FECHADO,
    }, // Not initialized/opened yet logic
  ];

  // Create Periods and Balancetes for Oct-Dec
  for (const t of timeline) {
    if (t.status === PeriodoStatus.ABERTO) {
      const dateObj = new Date(t.date);
      const p = periodoRepo.create({
        nucleo,
        mes: dateObj.getMonth() + 1,
        ano: dateObj.getFullYear(),
        status: t.status,
      });
      await periodoRepo.save(p);

      // Create Balancete
      const balancete = balanceteRepo.create({
        nucleoId: nucleo.id,
        ano_mes: t.ref.split('/').reverse().join('-'), // YYYY-MM
        saldo_inicial: 0,
        saldo_final: 0,
        total_receitas: 0,
        total_despesas: 0,
        criadoPor: users[1], // Tesoureiro
        status: BalanceteStatus.RASCUNHO,
      });
      await balanceteRepo.save(balancete);
    }
  }
  console.log('Periods & Balancetes initialized.');

  // 7. Mensalidades & Lancamentos
  const generateFinancials = async (
    user: Usuario,
    monthRef: string,
    dueDateStr: string,
    paymentDateStr: string,
    status: 'PAGO' | 'PENDENTE' | 'ATRASADO' | 'RASCUNHO_JANEIRO',
  ) => {
    const baseVal = Number(user.valor_base);

    // Mandatory Items
    const items = [
      {
        nome: 'Mensalidade',
        valor: baseVal,
        obrigatorio: true,
        selecionado: true,
        caixaId: tesouraria.id,
      },
      {
        nome: 'Repasse Diretoria Geral',
        valor: 24.57,
        obrigatorio: true,
        selecionado: true,
        caixaId: tesouraria.id,
      },
      {
        nome: 'Repasse 11ª Região',
        valor: 12.0,
        obrigatorio: true,
        selecionado: true,
        caixaId: tesouraria.id,
      },
    ];

    // Optional Items (Randomize)
    // 30% chance for Obras
    if (Math.random() > 0.7) {
      items.push({
        nome: 'Taxa de Obras',
        valor: 50.0,
        obrigatorio: false,
        selecionado: true,
        caixaId: caixaObras.id,
      });
    }

    // Total
    const total = items.reduce((acc, i) => acc + i.valor, 0);

    const m = new Mensalidade();
    m.nucleo = nucleo;
    m.socio = user;
    m.mes_referencia = monthRef;
    m.data_vencimento = dueDateStr;
    m.valor_base = baseVal;
    m.valor_total = total;
    m.itens = items;

    if (status === 'PAGO') {
      m.status = 'PAGO';
      m.valor_total = total;
      m.data_pagamento = new Date(paymentDateStr);
    } else if (status === 'PENDENTE' || status === 'RASCUNHO_JANEIRO') {
      m.status = 'PENDENTE';
      m.valor_total = 0;
    } else if (status === 'ATRASADO') {
      m.status = 'ATRASADO';
      m.valor_total = 0;
    }

    const savedMensalidade = await mensalidadeRepo.save(m);

    // Create Lancamento
    if (status === 'PAGO') {
      const l = new LancamentoFinanceiro();
      l.nucleo = nucleo;
      l.caixa = tesouraria;
      l.categoria = 'Mensalidade';
      l.descricao = `Mensalidade ${monthRef} - ${user.nomeCompleto}`;
      l.valor = total;
      l.tipo = 'RECEITA';
      l.status = 'REGISTRADO';
      l.data_movimento = new Date(paymentDateStr);
      l.criadoPor = users[1]; // Tesoureiro
      l.mensalidade = savedMensalidade;
      l.comprovante_url =
        'https://placehold.co/600x400/EEE/31343C?text=Comprovante+Fiscal';
      await lancamentoRepo.save(l);
    } else if (status === 'RASCUNHO_JANEIRO') {
      // Draft transaction for January
      const l = new LancamentoFinanceiro();
      l.nucleo = nucleo;
      l.caixa = tesouraria;
      l.categoria = 'Mensalidade';
      l.descricao = `Mensalidade ${monthRef} - ${user.nomeCompleto} (Rascunho)`;
      l.valor = total;
      l.tipo = 'RECEITA';
      l.status = 'RASCUNHO'; // Draft
      l.data_movimento = new Date(dueDateStr);
      l.criadoPor = users[1];
      l.mensalidade = savedMensalidade;
      await lancamentoRepo.save(l);
    }
  };

  // Generate Data
  console.log('Generating financial data...');

  // Sort users so we can pick specific ones for late fees
  const lateUsers = [
    users[users.length - 3],
    users[users.length - 4],
    users[users.length - 5],
  ]; // Just pick a few from the end
  const pendingJanUsers = [users[users.length - 6], users[users.length - 7]];

  for (const user of users) {
    // Determine Scenario for this user
    const isLateUser = lateUsers.some((u) => u.email === user.email);
    const isPendingJan = pendingJanUsers.some((u) => u.email === user.email);

    // Timeline:
    // Oct 2025
    await generateFinancials(
      user,
      '10/2025',
      '2025-10-10',
      '2025-10-10',
      'PAGO',
    );

    // Nov 2025
    if (isLateUser) {
      await generateFinancials(user, '11/2025', '2025-11-10', '', 'ATRASADO');
    } else {
      await generateFinancials(
        user,
        '11/2025',
        '2025-11-10',
        '2025-11-10',
        'PAGO',
      );
    }

    // Dec 2025
    if (isLateUser) {
      await generateFinancials(user, '12/2025', '2025-12-10', '', 'ATRASADO');
    } else {
      await generateFinancials(
        user,
        '12/2025',
        '2025-12-10',
        '2025-12-10',
        'PAGO',
      );
    }

    // Jan 2026
    if (isLateUser) {
      await generateFinancials(user, '01/2026', '2026-01-10', '', 'ATRASADO');
    } else if (isPendingJan) {
      await generateFinancials(user, '01/2026', '2026-01-10', '', 'PENDENTE');
    } else {
      // Most are draft/pending for current month usually, or partial
      // Request said: "os períodos de Outubro, Novembro e Dezembro devem inicializar como Abertos. O de Janeiro não precisa inicializar. Coloque alguns poucos sócios com atraso na mensalidade de Janeiro"
      // And "Crie também para este mês (01/2026) alguns lançamentos em rascunho."

      // Let's make 20% Rascusnho (Draft), 80% PENDENTE (Not yet paid/drafted)?
      // Or user said "Crie também para este mês... alguns lançamentos em rascunho"
      if (Math.random() > 0.7) {
        await generateFinancials(
          user,
          '01/2026',
          '2026-01-10',
          '',
          'RASCUNHO_JANEIRO',
        );
      } else {
        await generateFinancials(user, '01/2026', '2026-01-10', '', 'PENDENTE');
      }
    }
  }

  // Update Balancete Totals Logic (Simple manual aggregation since we are seeding)
  // Or we can rely on the app logic if we ran the service. But for seeding script, direct SQL update or manual calc is faster.
  // Ideally, we want the Balancete table to reflect the Lancamentos we just made.

  const updateBalancete = async (anoMes: string) => {
    const balancete = await balanceteRepo.findOne({
      where: { nucleoId: nucleo.id, ano_mes: anoMes },
    });
    if (!balancete) return;

    const receitas = await lancamentoRepo
      .createQueryBuilder('l')
      .select('SUM(l.valor)', 'total')
      .where('l.nucleo_id = :nid', { nid: nucleo.id })
      .andWhere('l.tipo = :tipo', { tipo: 'RECEITA' })
      .andWhere('l.status = :status', { status: 'REGISTRADO' })
      .andWhere("TO_CHAR(l.data_movimento, 'YYYY-MM') = :anoMes", { anoMes })
      .getRawOne<{ total: string }>();

    // Despesas (none seeded yet, but good to have logic)
    const totalR = parseFloat(receitas?.total || '0');

    // Update
    // Need prev balance if any.
    // Simplifying: assuming sequential run
    let previousBalance = 0;
    // VERY simple approach: October is first.
    if (anoMes === '2025-10') previousBalance = 0;
    if (anoMes === '2025-11') {
      const prev = await balanceteRepo.findOne({
        where: { nucleoId: nucleo.id, ano_mes: '2025-10' },
      });
      previousBalance = Number(prev?.saldo_final || 0);
    }
    if (anoMes === '2025-12') {
      const prev = await balanceteRepo.findOne({
        where: { nucleoId: nucleo.id, ano_mes: '2025-11' },
      });
      previousBalance = Number(prev?.saldo_final || 0);
    }

    balancete.saldo_inicial = previousBalance;
    balancete.total_receitas = totalR;
    balancete.total_despesas = 0;
    balancete.saldo_final = previousBalance + totalR;

    await balanceteRepo.save(balancete);
    console.log(
      `Balancete ${anoMes} updated. Saldo Final: ${balancete.saldo_final}`,
    );
  };

  await updateBalancete('2025-10');
  await updateBalancete('2025-11');
  await updateBalancete('2025-12');

  console.log('Seeding Complete!');
}

seed()
  .then(() => {
    console.log('Seed finished successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed', err);
    process.exit(1);
  });
