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
import { Mensalidade } from '../mensalidade/mensalidade.entity';
import { ContaBancaria } from '../conta-bancaria/conta-bancaria.entity';

@Entity('lancamento_financeiro')
export class LancamentoFinanceiro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tipo: string; // RECEITA, DESPESA

  @Column({ default: 'RASCUNHO' })
  status: string; // RASCUNHO, REGISTRADO

  @Column({ nullable: true })
  comprovante_url: string;

  @Column({ name: 'tipo_comprovante', nullable: true })
  tipoComprovante: string;

  @Column({ name: 'evidencia_drive_file_id', nullable: true })
  evidenciaDriveFileId: string;

  @Column({ name: 'evidencia_drive_folder_id', nullable: true })
  evidenciaDriveFolderId: string;

  @Column({ name: 'evidencia_web_view_link', nullable: true })
  evidenciaWebViewLink: string;

  @Column()
  descricao: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valor: number;

  @Column({ nullable: true })
  categoria: string;

  @Column({ nullable: true })
  subcategoria: string;

  @Column({ nullable: true })
  observacao: string;

  @Column()
  data_movimento: Date;

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

  @ManyToOne(() => ContaBancaria, { nullable: true })
  @JoinColumn({ name: 'conta_bancaria_id' })
  contaBancaria: ContaBancaria;

  @Column({ name: 'conta_bancaria_id', nullable: true })
  contaBancariaId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criadoPor: Usuario;

  @Column({ name: 'criado_por' })
  criadoPorId: string;

  @ManyToOne(() => Mensalidade, { nullable: true })
  @JoinColumn({ name: 'mensalidade_id' })
  mensalidade: Mensalidade;

  @Column({ name: 'mensalidade_id', nullable: true })
  mensalidadeId: string;

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;
}
