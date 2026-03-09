import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BalanceteMensal } from './balancete.entity';
import { Nucleo } from '../nucleo/nucleo.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from '../common/enums/role.enum';

@Entity('balancete_aprovacao')
export class BalanceteAprovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BalanceteMensal, (balancete) => balancete.aprovacoes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'balancete_id' })
  balancete: BalanceteMensal;

  @Column({ name: 'balancete_id', nullable: true })
  balanceteId: string;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id', nullable: true })
  nucleoId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id', nullable: true }) // making nullable to avoid conflict?
  usuarioId: string;

  @Column({ nullable: true })
  cargo_aprovador: string;

  @Column({ type: 'enum', enum: Role })
  role_aprovador: Role;

  @Column()
  status: string; // APROVADO, REPROVADO

  @Column({ type: 'text', nullable: true })
  ressalva: string;

  @CreateDateColumn()
  data_aprovacao: Date;
}
