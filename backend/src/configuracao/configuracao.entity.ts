import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';
import { Caixa } from '../caixa/caixa.entity';

@Entity('configuracao_financeira')
export class ConfiguracaoFinanceira {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  // Caixas de Destino Automático
  @ManyToOne(() => Caixa, { nullable: true })
  @JoinColumn({ name: 'caixa_dg_id' })
  caixaDg: Caixa | null;

  @Column({ name: 'caixa_dg_id', nullable: true })
  caixaDgId: string;

  @ManyToOne(() => Caixa, { nullable: true })
  @JoinColumn({ name: 'caixa_regiao_id' })
  caixaRegiao: Caixa | null;

  @Column({ name: 'caixa_regiao_id', nullable: true })
  caixaRegiaoId: string;

  @ManyToOne(() => Caixa, { nullable: true })
  @JoinColumn({ name: 'caixa_nucleo_id' })
  caixaNucleo: Caixa | null;

  @Column({ name: 'caixa_nucleo_id', nullable: true })
  caixaNucleoId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 24.57 })
  valor_repasse_dg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 12.0 })
  valor_repasse_regiao: number;

  @Column({
    name: 'politica_recibo_sem_nota_ativa',
    type: 'boolean',
    default: true,
  })
  politicaReciboSemNotaAtiva: boolean;

  @Column({
    name: 'politica_recibo_limite_salarios_minimos',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 1,
  })
  politicaReciboLimiteSalariosMinimos: number;

  @Column({
    name: 'politica_aprovacao_dupla_ativa',
    type: 'boolean',
    default: true,
  })
  politicaAprovacaoDuplaAtiva: boolean;

  @Column({
    name: 'politica_aprovacao_dupla_limite',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 5000,
  })
  politicaAprovacaoDuplaLimite: number;

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;
}
