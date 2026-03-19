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

@Entity('evidencia_auditoria_log')
export class EvidenciaAuditoriaLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entidade', type: 'varchar' })
  entidade: 'LANCAMENTO' | 'MENSALIDADE';

  @Column({ name: 'entidade_id' })
  entidadeId: string;

  @ManyToOne(() => Nucleo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string | null;

  @Column({ name: 'acao', type: 'varchar' })
  acao: 'ATTACH' | 'RELINK' | 'REMOVE' | 'MIGRATION_LINK';

  @Column({ name: 'anterior', type: 'jsonb', nullable: true })
  anterior: {
    comprovante_url?: string | null;
    evidenciaDriveFileId?: string | null;
    evidenciaWebViewLink?: string | null;
  } | null;

  @Column({ name: 'novo', type: 'jsonb', nullable: true })
  novo: {
    comprovante_url?: string | null;
    evidenciaDriveFileId?: string | null;
    evidenciaWebViewLink?: string | null;
  } | null;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;
}
