import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Mensalidade } from '../mensalidade/mensalidade.entity';
import { LancamentoFinanceiro } from '../lancamento/lancamento.entity';
import { Usuario } from '../usuario/usuario.entity';
// We need to import all entities for connection to work, or allow lazy loading?
// Safest is to list them or use path glob if supported in this env (ts-node).
import { Nucleo } from '../nucleo/nucleo.entity';
import { BalanceteMensal } from '../balancete/balancete.entity';
import { BalanceteAprovacao } from '../balancete/balancete-aprovacao.entity';
import { Caixa } from '../caixa/caixa.entity';
import { ContaBancaria } from '../conta-bancaria/conta-bancaria.entity';
import { Taxa } from '../taxa/taxa.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'balancete_db',
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
  ],
  synchronize: false,
});

async function check() {
  await dataSource.initialize();
  const mCount = await dataSource.getRepository(Mensalidade).count();
  const lCount = await dataSource.getRepository(LancamentoFinanceiro).count();
  const uCount = await dataSource.getRepository(Usuario).count();

  console.log(`Mensalidades: ${mCount}`);
  console.log(`Lancamentos: ${lCount}`);
  console.log(`Usuarios: ${uCount}`);

  // Check if Lancamento has mensalidade link
  const lWithLink = await dataSource.getRepository(LancamentoFinanceiro).count({
    where: { mensalidade: { id: undefined } }, // If undefined check works for NotNull? No.
    // We want check NOT NULL.
  });
  console.log(
    `Lancamentos with potential issues (undefined ID check): ${lWithLink}`,
  );

  // Actually let's just query one.
  const oneL = await dataSource.getRepository(LancamentoFinanceiro).findOne({
    where: { categoria: 'Mensalidade' },
    relations: ['mensalidade'],
  });

  if (oneL && oneL.mensalidade) {
    console.log(
      'Verification Success: Lancamento linked to Mensalidade found.',
    );
  } else {
    console.log('Verification Warning: Lancamento NOT linked or not found.');
  }

  await dataSource.destroy();
}

check().catch(console.error);
