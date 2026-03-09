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
import { Taxa } from '../taxa/taxa.entity';

@Entity('usuario_taxa')
export class UsuarioTaxa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @ManyToOne(() => Taxa)
  @JoinColumn({ name: 'taxa_id' })
  taxa: Taxa;

  @Column({ name: 'taxa_id' })
  taxaId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor_total: number;

  @Column({ type: 'int' })
  num_parcelas: number;

  @Column('jsonb')
  parcelas: {
    numero: number;
    valor: number;
    vencimento: string; // YYYY-MM-DD
    status: 'PENDENTE' | 'PAGO';
  }[];

  @Column({ type: 'date' })
  data_inicio: string; // First installment due date

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;
}
