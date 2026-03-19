import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';
import { Usuario } from '../usuario/usuario.entity';

@Entity('auditoria_log')
export class AuditoriaLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entidade' })
  entidade: 'LANCAMENTO' | 'MENSALIDADE' | 'PERIODO';

  @Column({ name: 'entidade_id' })
  entidadeId: string;

  @Column({ name: 'acao' })
  acao: string;

  @ManyToOne(() => Nucleo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string | null;

  @Column({ name: 'before_data', type: 'jsonb', nullable: true })
  beforeData: Record<string, unknown> | null;

  @Column({ name: 'after_data', type: 'jsonb', nullable: true })
  afterData: Record<string, unknown> | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;
}
