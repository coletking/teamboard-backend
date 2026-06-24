import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  user: { id: string; name: string; email: string };
}

/**
 * Business logic for authentication: hashing, credential verification and
 * issuing JWTs. Controllers stay thin and never touch bcrypt or the token
 * service directly.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.buildResult(user.id, user.name, user.email);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email, true);
    // Same error for "no user" and "wrong password" to avoid user enumeration.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildResult(user.id, user.name, user.email);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return { id: user.id, name: user.name, email: user.email };
  }

  private buildResult(id: string, name: string, email: string): AuthResult {
    const accessToken = this.jwtService.sign({ sub: id, email });
    return { accessToken, user: { id, name, email } };
  }
}
