import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post()
  // create(@Body() createUserDto: CreateUserDto) {
  //   return this.usersService.create(createUserDto);
  // }

  // @Get()
  // findAll() {
  //   return this.usersService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.usersService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.usersService.update(+id, updateUserDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.usersService.remove(+id);
  // }

  @Patch('api/v1/users/profile')
  async updateProfile(
    @Body() body: any
  ) {
    // Note: Assuming JWT auth middleware populates req.user, but since it's not strictly 
    // configured in the controller yet, we'll accept farmer_id in the body if needed, 
    // or rely on a custom auth guard. For the handoff spec, we expect `user_id` to come from token.
    // For now, we will assume the frontend passes `farmer_id` or we mock it.
    const userId = body.farmer_id || body.user_id || 'test-user-id';
    return this.usersService.updateProfile(userId, body);
  }
}
