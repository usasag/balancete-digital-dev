import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Nucleo } from '../nucleo/nucleo.entity';
import { Role } from '../common/enums/role.enum';
import { Grau } from '../common/enums/grau.enum';

@Entity('usuario')
@Index(['email'])
@Index(['nucleo'])
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'nome_completo' })
  nomeCompleto: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_base: number;

  @Column({ name: 'firebase_uid', nullable: true })
  firebaseUid: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.SOCIO,
  })
  role: Role;

  @Column({ nullable: true })
  cargo: string;

  @Column({
    type: 'enum',
    enum: Grau,
    nullable: true,
  })
  grau: Grau;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @ManyToOne(() => Nucleo, (nucleo) => nucleo.usuarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nucleo_id' })
  nucleo: Nucleo;

  @Column({ name: 'nucleo_id' })
  nucleoId: string;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'data_atualizacao' })
  dataAtualizacao: Date;
}
