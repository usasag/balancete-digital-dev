import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async findByFirebaseUid(firebaseUid: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({
      where: { firebaseUid },
      relations: ['nucleo'],
      select: [
        'id',
        'email',
        'nomeCompleto',
        'role',
        'firebaseUid',
        'nucleoId',
      ], // Ensure role and nucleoId are selected
    });
  }

  async findById(id: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({
      where: { id },
      relations: ['nucleo'],
    });
  }

  async create(data: Partial<Usuario>): Promise<Usuario> {
    const user = this.usuarioRepository.create(data);
    return this.usuarioRepository.save(user);
  }

  async findAllByNucleo(nucleoId: string): Promise<Usuario[]> {
    return this.usuarioRepository.find({
      where: { nucleo: { id: nucleoId } },
      order: { nomeCompleto: 'ASC' },
    });
  }

  async findOneByFirebaseUid(uid: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({
      where: { firebaseUid: uid },
      relations: ['nucleo'],
    });
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({
      where: { email },
      relations: ['nucleo'],
    });
  }

  async update(id: string, data: Partial<Usuario>): Promise<Usuario> {
    await this.usuarioRepository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Usuario not found after update');
    }
    return updated;
  }
  async findAllActive(): Promise<Usuario[]> {
    return this.usuarioRepository.find({
      where: { ativo: true },
      relations: ['nucleo'],
    });
  }
}
