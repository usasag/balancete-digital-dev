import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Grau } from '../../common/enums/grau.enum';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsNumber()
  valor_base?: number;

  @IsOptional()
  @IsEnum(Grau)
  grau?: Grau;
}
