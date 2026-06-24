import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsEmail()
  email: string;

  // 72 is bcrypt's effective byte limit; reject anything longer up-front.
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
