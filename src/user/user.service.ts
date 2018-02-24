import { Component, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { CreateUserDto } from './user.dto';
const jwt = require('jsonwebtoken');
import { SECRET } from '../config';
import { UserRO } from './user.interface';
import { DeepPartial } from 'typeorm/common/DeepPartial';
import { validate } from 'class-validator';
import { HttpException } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';

@Component()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findAll(): Promise<UserEntity[]> {
    return await this.userRepository.find();
  }

  async findOne(options?: DeepPartial<UserEntity>): Promise<UserEntity> {
    return await this.userRepository.findOne(options);
  }

  async create(userData: CreateUserDto): Promise<UserRO> {

    let user = new UserEntity();
    user.username = userData.username;
    user.email = userData.email;
    user.password = userData.password;

    const errors = await validate(user);
    if (errors.length > 0) {
      console.log(errors);
      throw new HttpException('Data not valid', HttpStatus.BAD_REQUEST)
    } else {
      // Todo: handle email unique validator better
      const savedUser = await this.userRepository.save(user);
      const userRO = {
        username: savedUser.username,
        email: savedUser.email,
        bio: savedUser.bio,
        token: this.generateJWT(savedUser),
        image: savedUser.image
      };

      return {user: userRO};
    }

  }

  async update(id: number, userData: any): Promise<UserEntity> {
    let toUpdate = await this.userRepository.findOneById(id);
    delete toUpdate.password;
    delete toUpdate.favorites;
    if (userData.id) delete userData.id;

    let updated = Object.assign(toUpdate, userData);
    return await this.userRepository.save(updated);
  }

  async delete(email: string): Promise<void> {
    return await this.userRepository.delete({ email: email});
  }

  async findById(id: number): Promise<UserEntity>{
    const user = await this.userRepository.findOneById(id);
    if (user) delete user.password;
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity>{
    const user = await this.userRepository.findOne({email: email});
    if (user) delete user.password;
    return user;
  }

  public generateJWT(user) {
    let today = new Date();
    let exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
      id: user.id,
      username: user.username,
      email: user.email,
      exp: exp.getTime() / 1000,
    }, SECRET);
  };
}