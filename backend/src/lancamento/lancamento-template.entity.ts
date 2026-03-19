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
import { Usuario } from '../usuario/usuario.entity';
import { Caixa } from '../caixa/caixa.entity';

@Entity('lancamento_template')
export class LancamentoTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column()
  tipo: 'RECEITA' | 'DESPESA';

  @Column()
  categoria: string;

  @Column({ type: 'varchar', nullable: true })
  subcategoria: string | null;

  @Column()
  descricao: string;

  @Column({ type: 'varchar', nullable: true })
  observacao: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valor: number;

  @ManyToOne(() => Caixa, { nullable: true })
  @JoinColumn({ name: 'caixa_id' })
  caixa: Caixa | null;

  @Column({ name: 'caixa_id', type: 'varchar', nullable: true })
  caixaId: string | null;

  @ManyToOne(() => Nucleo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'criado_por_id' })
  criadoPor: Usuario | null;

  @Column({ name: 'criado_por_id', type: 'varchar', nullable: true })
  criadoPorId: string | null;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'data_atualizacao' })
  dataAtualizacao: Date;
}
