import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LancamentoService } from './lancamento.service';
import { AuthGuard } from '@nestjs/passport';
import { LancamentoFinanceiro } from './lancamento.entity';
import * as typeorm from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from 'src/common/enums/role.enum';
import { FileStorageService } from '../file-storage/file-storage.service';

// Define the Multer file type explicitly since Express types may not be available globally
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface CreateLancamentoBody {
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  valor: string | number;
  categoria: string;
  subcategoria?: string;
  observacao?: string;
  data_movimento: string;
  nucleoId: string;
  criadoPorId: string;
  caixaId?: string;
  status?: 'RASCUNHO' | 'REGISTRADO';
}

@Controller('lancamentos')
@UseGuards(AuthGuard('firebase-jwt'))
export class LancamentoController {
  constructor(
    private readonly service: LancamentoService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Request() req: { user: Usuario },
    @Body() body: CreateLancamentoBody,
    @UploadedFile() file?: MulterFile,
  ) {
    let comprovante_url: string | undefined;

    if (file) {
      comprovante_url = this.fileStorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        body.nucleoId,
      );
    }

    const data: typeorm.DeepPartial<LancamentoFinanceiro> = {
      ...body,
      valor:
        typeof body.valor === 'string' ? parseFloat(body.valor) : body.valor,
      comprovante_url,
    };

    return this.service.create(data);
  }

  @Get('nucleo/:id')
  async findAllByNucleo(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
  ) {
    const lancamentos = await this.service.findAllByNucleo(id);
    const userRole = req.user?.role;

    if (
      userRole === Role.CONTABILIDADE_UNICA ||
      userRole === Role.CONSELHO_FISCAL ||
      userRole === Role.SOCIO
    ) {
      return lancamentos.map((l) => {
        if (l.categoria === 'Mensalidade') {
          return { ...l, descricao: 'Mensalidade (Sócio Oculto)' };
        }
        return l;
      });
    }

    return lancamentos;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id') id: string,
    @Body() body: CreateLancamentoBody,
    @UploadedFile() file?: MulterFile,
  ) {
    let comprovante_url: string | undefined;

    if (file) {
      comprovante_url = this.fileStorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        body.nucleoId,
      );
    }

    const data: typeorm.DeepPartial<LancamentoFinanceiro> = {
      ...body,
      valor:
        typeof body.valor === 'string' ? parseFloat(body.valor) : body.valor,
      ...(comprovante_url && { comprovante_url }),
    };

    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
