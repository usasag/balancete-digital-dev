import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Mensalidade } from './mensalidade.entity';
import { Usuario } from '../usuario/usuario.entity';

@Entity('mensalidade_pagamento')
export class MensalidadePagamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Mensalidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mensalidade_id' })
  mensalidade: Mensalidade;

  @Column({ name: 'mensalidade_id' })
  mensalidadeId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ name: 'metodo_pagamento' })
  metodoPagamento: string;

  @Column({ name: 'data_pagamento' })
  dataPagamento: Date;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recebido_por_id' })
  recebidoPor: Usuario | null;

  @Column({ name: 'recebido_por_id', nullable: true })
  recebidoPorId: string | null;

  @Column({ name: 'observacao', nullable: true })
  observacao: string;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;
}
