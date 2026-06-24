import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * Owns all persistence concerns for users. Auth-related logic (hashing,
 * tokens) lives in AuthService — this service only knows how to store and
 * retrieve user records, keeping the data boundary clean enough to later
 * extract into a standalone UserService.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  create(data: CreateUserData): Promise<UserDocument> {
    return this.userModel.create(data);
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
}
