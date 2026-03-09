import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';

@Entity('categoria_financeira')
export class CategoriaFinanceira {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ type: 'enum', enum: ['RECEITA', 'DESPESA'] })
  tipo: 'RECEITA' | 'DESPESA';

  @Column('simple-array', { nullable: true })
  subcategorias: string[];

  @Column({ default: true })
  ativa: boolean;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'data_atualizacao' })
  dataAtualizacao: Date;
}
