import { DataSource } from 'typeorm';
import { Usuario } from './src/usuario/usuario.entity';
import { Nucleo } from './src/nucleo/nucleo.entity';
import { Mensalidade } from './src/mensalidade/mensalidade.entity';
import { LancamentoFinanceiro } from './src/lancamento/lancamento.entity';
import { BalanceteMensal } from './src/balancete/balancete.entity';
import { BalanceteAprovacao } from './src/balancete/balancete-aprovacao.entity';
import { Role } from './src/common/enums/role.enum';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'adminpassword',
  database: process.env.DB_NAME || 'balancete_digital',
  entities: [
    Usuario,
    Nucleo,
    Mensalidade,
    LancamentoFinanceiro,
    BalanceteMensal,
    BalanceteAprovacao,
  ],
  synchronize: false,
});

const users = [
  {
    email: 'vitorbrauna22@gmail.com',
    firebaseUid: 'G0xlFBi3Prfn96yn65f0PIzyWu82',
    role: Role.SOCIO,
    nome: 'Vitor Sócio',
  },
  {
    email: 'vitor.brauna22@gmail.com',
    firebaseUid: '4rIGIBS3guRo6knWDbmLHaXVnie2',
    role: Role.CONSELHO_FISCAL,
    nome: 'Vitor Conselho',
  },
  {
    email: 'vitor.brauna.22@gmail.com',
    firebaseUid: '2MdddUe9XZcdk84IrrH7lUI6Tjg2',
    role: Role.TESOURARIA,
    nome: 'Vitor Tesoureiro 2',
  },
  {
    email: 'vitorbrauna.22@gmail.com',
    firebaseUid: 'FnxijL5VEOR78mjIPJXKjHPEhLn2',
    role: Role.TESOURARIA,
    nome: 'Vitor Tesoureiro 1',
  },
  {
    email: 'v.itorbrauna22@gmail.com',
    firebaseUid: 'y775Bi9nCYdpciU3ZQDnqvRDTUu2',
    role: Role.PRESIDENCIA,
    nome: 'Vitor Presidente',
  },
];

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected.');

  const nucleoRepo = AppDataSource.getRepository(Nucleo);
  const userRepo = AppDataSource.getRepository(Usuario);

  // Updated Nucleo Details
  const nucleoName = 'Núcleo Linha de Tucunacá';
  let nucleo = await nucleoRepo.findOne({ where: { nome: nucleoName } });

  if (!nucleo) {
    nucleo = nucleoRepo.create({
      nome: nucleoName,
      cidade: 'Itaitinga',
      estado: 'CE',
      endereco: 'Santo Antônio, Itaitinga - CE, 61880-000',
    });
    await nucleoRepo.save(nucleo);
    console.log('Created Nucleo: ', nucleo.nome);
  } else {
    console.log('Found Nucleo: ', nucleo.nome);
    // Update fields if needed
    nucleo.cidade = 'Itaitinga';
    nucleo.estado = 'CE';
    await nucleoRepo.save(nucleo);
  }

  for (const u of users) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = userRepo.create({
        email: u.email,
        nomeCompleto: u.nome,
        firebaseUid: u.firebaseUid,
        role: u.role,
        nucleo: nucleo,
        ativo: true,
      });
      await userRepo.save(user);
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      user.firebaseUid = u.firebaseUid;
      user.role = u.role;
      user.nucleo = nucleo; // Ensure linked
      await userRepo.save(user);
      console.log(`Updated user: ${u.email} (${u.role})`);
    }
  }

  await AppDataSource.destroy();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Error seeding:', err);
  process.exit(1);
});
