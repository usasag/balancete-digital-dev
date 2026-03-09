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

@Entity('caixa')
export class Caixa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string; // Ex: "Tesouraria", "Beneficência"

  @Column({ default: true })
  ativo: boolean;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  saldoInicial: number;

  @Column({ type: 'jsonb', nullable: true, name: 'distribuicao_inicial' })
  distribuicaoInicial: {
    dinheiro: number;
    contas: Record<string, number>; // contaId -> valor
    outros: number;
  };

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'data_atualizacao' })
  dataAtualizacao: Date;
}
