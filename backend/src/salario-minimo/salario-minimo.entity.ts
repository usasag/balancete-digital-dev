import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('salario_minimo_historico')
export class SalarioMinimoHistorico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  ano: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ name: 'fonte', nullable: true })
  fonte: string;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;
}
