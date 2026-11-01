import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../auth/permissions.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { CurrentActor } from '../common/guards/current-actor.decorator.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { CreateUserDto, SetUserPasswordDto, UpdateUserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('Users')
@RequirePermissions(Permission.ManageSystem)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get('roles')
  listRoles() {
    return this.users.listRoles();
  }

  @Post()
  create(@Body() input: CreateUserDto) {
    return this.users.create(input);
  }

  @Put(':id')
  update(@CurrentActor() actor: ActorContext, @Param('id') id: string, @Body() input: UpdateUserDto) {
    return this.users.update(actor.userId, id, input);
  }

  @Put(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPassword(@Param('id') id: string, @Body() input: SetUserPasswordDto): Promise<void> {
    await this.users.setPassword(id, input.password);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentActor() actor: ActorContext, @Param('id') id: string): Promise<void> {
    await this.users.delete(actor.userId, id);
  }
}
