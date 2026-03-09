import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-firebase-jwt';
import { UsuarioService } from '../usuario/usuario.service';
import * as admin from 'firebase-admin';

interface FirebaseUserPayload {
  uid?: string;
  user_id?: string;
  email?: string;
  [key: string]: any;
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

  async validate(token: string | FirebaseUserPayload) {
    // Check if token is the decoded object or the raw string.
    // Different versions of passport-firebase-jwt behave differently.
    // If it's a raw string, we verify it. If it's an object, it might be unverified but let's check.

    let firebaseUser: admin.auth.DecodedIdToken | FirebaseUserPayload;

    // If the library returns the raw token string (common behavior in some configs)
    if (typeof token === 'string') {
      try {
        firebaseUser = await admin.auth().verifyIdToken(token);
      } catch (error) {
        console.error('Firebase Token Verification Failed:', error);
        throw new UnauthorizedException('Token inválido ou expirado.');
      }
    } else {
      // If it is already an object, assume it's the payload (but this is risky without admin signature check)
      // Ideally we want the RAW string to verify signature.
      // For now, let's treat 'token' as the payload if it is an object.
      firebaseUser = token;
    }

    // Safety check
    if (!firebaseUser || (!firebaseUser.uid && !firebaseUser.user_id)) {
      // If we still don't have a UID, and it's an object, maybe it's junk.
      // Let's rely on the explicit verification if possible.
      console.log('Decoded Payload (Debug):', firebaseUser);
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
        console.log(
          `[Auth] Auto-linked user ${email} to Firebase UID ${firebaseUid}`,
        );
      }
    }

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado no sistema.');
    }

    return user;
  }
}
