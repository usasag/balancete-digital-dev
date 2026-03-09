import { IsString, Matches } from 'class-validator';

export class CreateBalanceteDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'ano_mes deve estar no formato YYYY-MM',
  })
  ano_mes: string;
}
