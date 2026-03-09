import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateBalanceteDto {
  @IsNotEmpty()
  @IsString()
  ano_mes: string;
}

export class ApproveBalanceteDto {
  @IsNotEmpty()
  @IsEnum(['APROVADO', 'REPROVADO'])
  status: 'APROVADO' | 'REPROVADO';

  @IsOptional()
  @IsString()
  ressalva?: string;
}
