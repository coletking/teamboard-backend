import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findByEmail' | 'create' | 'findById'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('signup', () => {
    it('hashes the password, creates the user and returns a token', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue({
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
      } as never);

      const result = await authService.signup({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret123',
      });

      expect(users.create).toHaveBeenCalledTimes(1);
      const created = users.create.mock.calls[0][0];
      // Password must be hashed, never stored in plain text.
      expect(created.passwordHash).not.toBe('secret123');
      expect(await bcrypt.compare('secret123', created.passwordHash)).toBe(true);
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
      });
    });

    it('rejects a duplicate email', async () => {
      users.findByEmail.mockResolvedValue({ id: 'existing' } as never);

      await expect(
        authService.signup({
          name: 'Ada',
          email: 'ada@example.com',
          password: 'secret123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      users.findByEmail.mockResolvedValue({
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
        passwordHash,
      } as never);

      const result = await authService.login({
        email: 'ada@example.com',
        password: 'secret123',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('throws Unauthorized for a wrong password', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      users.findByEmail.mockResolvedValue({
        id: 'u1',
        passwordHash,
      } as never);

      await expect(
        authService.login({ email: 'ada@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Unauthorized when the user does not exist', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'secret123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
