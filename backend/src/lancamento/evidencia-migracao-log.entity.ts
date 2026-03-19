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

@Entity('evidencia_migracao_log')
export class EvidenciaMigracaoLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ name: 'arquivo_nome' })
  arquivoNome: string;

  @Column({ name: 'total_linhas', type: 'int' })
  totalLinhas: number;

  @Column({ name: 'linhas_processadas', type: 'int' })
  linhasProcessadas: number;

  @Column({ name: 'linhas_com_erro', type: 'int' })
  linhasComErro: number;

  @Column({ name: 'erros', type: 'jsonb', nullable: true })
  erros: Array<{ linha: number; mensagem: string }> | null;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;
}
