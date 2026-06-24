import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { InviteMemberDto } from '../../dto/projects/invite-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.listMembers(projectId, userId);
  }

  @Post()
  invite(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.projectsService.inviteMember(projectId, userId, dto.email);
  }

  @Delete(':userId')
  remove(
    @CurrentUser('userId') adminId: string,
    @Param('projectId') projectId: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.projectsService.removeMember(projectId, adminId, memberUserId);
  }
}
