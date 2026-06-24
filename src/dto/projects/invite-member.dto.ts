import { IsEmail } from 'class-validator';

/**
 * Admin invites a teammate by email. If no account exists for that email one is
 * created with the configured default password; otherwise the existing user is
 * added to the project.
 */
export class InviteMemberDto {
  @IsEmail()
  email: string;
}
