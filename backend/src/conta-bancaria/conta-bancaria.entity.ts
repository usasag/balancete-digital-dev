import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';

@Entity('conta_bancaria')
export class ContaBancaria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome_conta: string; // "Conta Principal", "Fundo Reserva"

  @Column()
  banco: string; // "Banco do Brasil"

  @Column()
  agencia: string;

  @Column()
  numero_conta: string;

  @Column({ nullable: true })
  cnpj_instituicao: string; // CNPJ do banco ou da conta

  @Column({ nullable: true })
  chave_pix: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  saldo_disponivel: number;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @Column({ default: true })
  ativa: boolean;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'data_atualizacao' })
  dataAtualizacao: Date;
}
