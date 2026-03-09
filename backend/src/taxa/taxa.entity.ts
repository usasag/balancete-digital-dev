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
import { Caixa } from '../caixa/caixa.entity';

@Entity('taxa')
export class Taxa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @ManyToOne(() => Caixa, { nullable: true })
  @JoinColumn({ name: 'caixa_id' })
  caixa: Caixa;

  @Column({ name: 'caixa_id', nullable: true })
  caixaId: string;

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ default: false })
  parcelado: boolean;

  @Column({ default: 1 })
  total_parcelas: number;

  @Column({ default: true })
  ativa: boolean;

  @Column({ default: false })
  opcional: boolean;

  @Column({ default: false })
  variavel: boolean;

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;
}
