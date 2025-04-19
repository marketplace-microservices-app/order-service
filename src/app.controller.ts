import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateOrderPayload } from './types/CreateOrderPayload.interface';
import { Payload } from '@nestjs/microservices';

@Controller('api/orders')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('create')
  createOrder(@Payload() orderData: CreateOrderPayload) {
    return this.appService.createOrder(orderData);
  }
}
