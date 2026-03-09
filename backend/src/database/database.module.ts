import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        console.log('DB Config:', {
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          user: configService.get<string>('DATABASE_USER'),
          db: configService.get<string>('DATABASE_NAME'),
        });
        return {
          type: 'postgres',
          host: '127.0.0.1',
          port: 5432,
          username: 'admin',
          password: 'adminpassword',
          database: 'balancete_digital',
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true, // DEV ONLY
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
