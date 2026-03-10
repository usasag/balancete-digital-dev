import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DATABASE_HOST') || '127.0.0.1';
        const port = Number(configService.get<string>('DATABASE_PORT') || 5432);
        const username = configService.get<string>('DATABASE_USER') || 'admin';
        const password =
          configService.get<string>('DATABASE_PASSWORD') || 'adminpassword';
        const database =
          configService.get<string>('DATABASE_NAME') || 'balancete_digital';

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true, // DEV ONLY
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
