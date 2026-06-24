import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { TasksService } from './tasks.service';
import { Task } from '../../schemas/tasks/task.schema';
import { ProjectsService } from '../projects/projects.service';

describe('TasksService', () => {
  let tasksService: TasksService;
  let projects: jest.Mocked<Pick<ProjectsService, 'findForMember'>>;
  let taskModel: { create: jest.Mock; deleteMany: jest.Mock };

  const userId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    projects = { findForMember: jest.fn() };
    taskModel = {
      create: jest.fn(),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: ProjectsService, useValue: projects },
      ],
    }).compile();

    tasksService = moduleRef.get(TasksService);
  });

  describe('create', () => {
    it('verifies project membership before creating the task', async () => {
      projects.findForMember.mockResolvedValue({} as never);
      taskModel.create.mockResolvedValue({ id: 't1' });

      await tasksService.create(projectId, userId, { title: 'Write tests' });

      expect(projects.findForMember).toHaveBeenCalledWith(projectId, userId);
      expect(taskModel.create).toHaveBeenCalledTimes(1);
    });

    it('does not create a task when the user is not a member', async () => {
      projects.findForMember.mockRejectedValue(new ForbiddenException());

      await expect(
        tasksService.create(projectId, userId, { title: 'Nope' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(taskModel.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFound for an invalid ObjectId', async () => {
      await expect(
        tasksService.findOne('not-an-id', userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('handleProjectDeleted', () => {
    it('deletes every task belonging to the removed project', async () => {
      await tasksService.handleProjectDeleted({ projectId });

      expect(taskModel.deleteMany).toHaveBeenCalledTimes(1);
      const filter = taskModel.deleteMany.mock.calls[0][0];
      expect(filter.project.toString()).toBe(projectId);
    });
  });
});
