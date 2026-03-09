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

export enum PeriodoStatus {
  ABERTO = 'ABERTO',
  FECHADO = 'FECHADO',
}

export interface ReaberturaLog {
  data: Date;
  usuarioId: string;
  justificativa: string;
}

@Entity('periodo_contabil')
export class Periodo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mes: number; // 1-12

  @Column()
  ano: number;

  @Column({
    type: 'enum',
    enum: PeriodoStatus,
    default: PeriodoStatus.ABERTO,
  })
  status: PeriodoStatus;

  @Column({ type: 'jsonb', default: [] })
  reaberturas: ReaberturaLog[];

  @Column({ nullable: true })
  data_fechamento: Date;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
