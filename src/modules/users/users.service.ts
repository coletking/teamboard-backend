import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/users/user.schema';
import { hashPassword } from '../../common/utils/password.util';

const DUPLICATE_KEY = 11000;

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.userModel.create({
        name: input.name,
        email: input.email,
        passwordHash,
      });
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  findByEmail(
    email: string,
    withPassword = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (withPassword) query.select('+passwordHash');
    return query.exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

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
