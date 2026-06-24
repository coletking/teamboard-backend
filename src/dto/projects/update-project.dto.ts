import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

/** All create fields, but every one optional — used for PATCH updates. */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
