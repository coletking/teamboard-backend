import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/users/user.schema';
import { hashPassword } from '../../common/utils/password.util';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Owns all persistence for users, including password hashing on creation.
 * Auth flow (tokens, credential checks) lives in AuthService; project invites
 * reuse `findOrCreate` here. This keeps user storage in one place — clean
 * enough to later extract into a standalone User service.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const passwordHash = await hashPassword(input.password);
    return this.userModel.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
  }

  /** Look up by email; pass `withPassword` when the hash is needed for login. */
  findByEmail(email: string, withPassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (withPassword) query.select('+passwordHash');
    return query.exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /**
   * Used by project invites: return the existing user for an email, or create a
   * new account with the provided default password (deriving a name from the
   * email local-part).
   */
  async findOrCreate(
    email: string,
    defaultPassword: string,
  ): Promise<{ user: UserDocument; created: boolean }> {
    const existing = await this.findByEmail(email);
    if (existing) return { user: existing, created: false };
    const name = email.split('@')[0];
    const user = await this.create({ name, email, password: defaultPassword });
    return { user, created: true };
  }
}
