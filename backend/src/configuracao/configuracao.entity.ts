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
  @ManyToOne('Caixa', { nullable: true })
  @JoinColumn({ name: 'caixa_dg_id' })
  caixaDg: any;

  @Column({ name: 'caixa_dg_id', nullable: true })
  caixaDgId: string;

  @ManyToOne('Caixa', { nullable: true })
  @JoinColumn({ name: 'caixa_regiao_id' })
  caixaRegiao: any;

  @Column({ name: 'caixa_regiao_id', nullable: true })
  caixaRegiaoId: string;

  @ManyToOne('Caixa', { nullable: true })
  @JoinColumn({ name: 'caixa_nucleo_id' })
  caixaNucleo: any;

  @Column({ name: 'caixa_nucleo_id', nullable: true })
  caixaNucleoId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 24.57 })
  valor_repasse_dg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 12.0 })
  valor_repasse_regiao: number;

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;
}
