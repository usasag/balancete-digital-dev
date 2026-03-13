import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-firebase-jwt';
import { UsuarioService } from '../usuario/usuario.service';
import * as admin from 'firebase-admin';

interface FirebaseUserPayload {
  uid?: string;
  user_id?: string;
  email?: string;
  [key: string]: unknown;
}

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(
  Strategy,
  'firebase-jwt',
) {
  constructor(private usuarioService: UsuarioService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'balancete-digital',
      });
    }
  }

  async validate(token: string) {
    if (typeof token !== 'string') {
      throw new UnauthorizedException('Formato de token inválido.');
    }

    let firebaseUser: admin.auth.DecodedIdToken;

    try {
      firebaseUser = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Firebase Token Verification Failed:', error);
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    // Safety check
    if (!firebaseUser || !firebaseUser.uid) {
      throw new UnauthorizedException('Token inválido: UID não encontrado.');
    }

    const firebaseUid = firebaseUser.uid;
    const email = firebaseUser.email;

    let user = await this.usuarioService.findByFirebaseUid(firebaseUid || '');

    if (!user && email) {
      // Auto-Link
      user = await this.usuarioService.findByEmail(email);
      if (user) {
        user = await this.usuarioService.update(user.id, { firebaseUid });
      }
    }

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado no sistema.');
    }

    return user;
  }
}
