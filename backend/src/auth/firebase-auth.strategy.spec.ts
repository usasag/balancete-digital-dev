import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as admin from 'firebase-admin';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';
import { UsuarioService } from '../usuario/usuario.service';

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
}));

describe('FirebaseAuthStrategy', () => {
  let strategy: FirebaseAuthStrategy;
  let usuarioService: UsuarioService;

  const mockUsuarioService = {
    findByFirebaseUid: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseAuthStrategy,
        { provide: UsuarioService, useValue: mockUsuarioService },
      ],
    }).compile();

    strategy = module.get<FirebaseAuthStrategy>(FirebaseAuthStrategy);
    usuarioService = module.get<UsuarioService>(UsuarioService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should verify raw string token using admin.auth().verifyIdToken', async () => {
      const mockDecodedToken = { uid: 'test-uid', email: 'test@example.com' };
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);
      mockUsuarioService.findByFirebaseUid.mockResolvedValue({ id: 'user-id', firebaseUid: 'test-uid' });

      const result = await strategy.validate('valid-token-string');

      expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('valid-token-string');
      expect(result).toEqual({ id: 'user-id', firebaseUid: 'test-uid' });
    });

    it('should throw UnauthorizedException if token is an object', async () => {
      const mockTokenObject = { uid: 'bypass-uid', email: 'bypass@example.com' };

      await expect(strategy.validate(mockTokenObject as any)).rejects.toThrow(UnauthorizedException);
      expect(admin.auth().verifyIdToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if verifyIdToken fails', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await expect(strategy.validate('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
