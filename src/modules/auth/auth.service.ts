import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from '../../dto/auth/signup.dto';
import { LoginDto } from '../../dto/auth/login.dto';
import { comparePassword } from '../../common/utils/password.util';

export interface AuthResult {
  accessToken: string;
  user: { id: string; name: string; email: string };
}

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
    const user = await this.usersService.create(dto);
    return this.buildResult(user.id, user.name, user.email);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email, true);

    if (!user || !(await comparePassword(dto.password, user.passwordHash))) {
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
