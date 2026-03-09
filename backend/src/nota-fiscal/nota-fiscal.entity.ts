import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';
import { LancamentoFinanceiro } from '../lancamento/lancamento.entity';

@Entity('nota_fiscal')
export class NotaFiscal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imagem_url: string; // Firebase URL

  @ManyToOne(() => LancamentoFinanceiro)
  @JoinColumn({ name: 'lancamento_id' })
  lancamento: LancamentoFinanceiro;

  @Column({ name: 'lancamento_id', nullable: true })
  lancamentoId: string;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @CreateDateColumn()
  data_upload: Date;
}
