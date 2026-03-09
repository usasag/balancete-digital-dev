import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';
import { Usuario } from '../usuario/usuario.entity';
import { BalanceteAprovacao } from './balancete-aprovacao.entity';

export enum BalanceteStatus {
  RASCUNHO = 'RASCUNHO',
  EM_APROVACAO = 'EM_APROVACAO',
  APROVADO = 'APROVADO',
  APROVADO_COM_RESSALVAS = 'APROVADO_COM_RESSALVAS',
  PUBLICADO = 'PUBLICADO',
}

@Entity('balancete_mensal')
export class BalanceteMensal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @Column()
  ano_mes: string; // YYYY-MM

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_receitas: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_despesas: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  saldo_inicial: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  saldo_final: number;

  @Column('jsonb', { nullable: true })
  conteudo_renderizado: any;

  @Column({
    type: 'enum',
    enum: BalanceteStatus,
    default: BalanceteStatus.RASCUNHO,
  })
  status: BalanceteStatus;

  @Column({ default: false })
  publicado: boolean;

  @Column({ nullable: true })
  data_publicacao: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'publicado_por' })
  publicadoPor: Usuario;

  @Column({ name: 'publicado_por', nullable: true })
  publicadoPorId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criadoPor: Usuario;

  @Column({ name: 'criado_por' })
  criadoPorId: string;

  @OneToMany(() => BalanceteAprovacao, (aprovacao) => aprovacao.balancete)
  aprovacoes: BalanceteAprovacao[];

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;
}
