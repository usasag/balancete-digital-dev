import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Nucleo } from '../nucleo/nucleo.entity';

@Entity('mensalidade')
export class Mensalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'socio_id' })
  socio: Usuario;

  @Column({ name: 'socio_id' })
  socioId: string;

  @ManyToOne(() => Nucleo)
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_base: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_total: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_pago_acumulado: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  saldo_aberto: number;

  @Column({ type: 'text', nullable: true })
  data_vencimento: string; // YYYY-MM-DD

  @Column('jsonb', { nullable: true })
  itens: {
    nome: string;
    valor: number;
    obrigatorio: boolean;
    selecionado: boolean;
    caixaId?: string;
  }[];

  @Column('jsonb', { nullable: true })
  taxa_extra: {
    descricao: string;
    valor_total: number;
    parcela_atual: number;
    total_parcelas: number;
    valor_parcela: number;
    caixaId?: string;
  }[];

  @Column()
  mes_referencia: string; // MM/YYYY

  @Column({ default: 'PENDENTE' })
  status: string; // PENDENTE, PAGO, ATRASADO

  @Column({ nullable: true })
  data_pagamento: Date;

  @Column({ name: 'metodo_pagamento', nullable: true })
  metodoPagamento: string;

  @Column({ nullable: true })
  data_acordo: Date;

  @Column({ name: 'evidencia_drive_file_id', nullable: true })
  evidenciaDriveFileId: string;

  @Column({ name: 'evidencia_drive_folder_id', nullable: true })
  evidenciaDriveFolderId: string;

  @Column({ name: 'evidencia_web_view_link', nullable: true })
  evidenciaWebViewLink: string;

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;
}
