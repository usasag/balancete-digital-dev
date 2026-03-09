import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsuarioModule } from '../usuario/usuario.module';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'firebase-jwt' }),
    UsuarioModule,
  ],
  providers: [FirebaseAuthStrategy, RolesGuard],
  exports: [PassportModule, RolesGuard],
})
export class AuthModule {}
