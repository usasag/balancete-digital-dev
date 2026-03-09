import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@Entity('nucleo')
export class Nucleo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  endereco: string;

  @Column({ nullable: true })
  cidade: string;

  @Column({ nullable: true })
  estado: string;

  @OneToMany(() => Usuario, (usuario) => usuario.nucleo)
  usuarios: Usuario[];

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'data_atualizacao' })
  dataAtualizacao: Date;
}
