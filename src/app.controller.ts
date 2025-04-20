import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateOrderPayload } from './types/CreateOrderPayload.interface';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('api/orders')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('order.create')
  @Post('create')
  createOrder(@Payload() orderData: CreateOrderPayload) {
    return this.appService.createOrder(orderData);
  }

  @MessagePattern('order.cancel')
  @Post('cancel')
  cancelOrder(@Payload() orderId) {
    const { orderId: id } = orderId;
    return this.appService.cancelOrder(id);
  }

  @MessagePattern('order.get-orders-by-buyerId')
  @Post('get-orders-by-buyerId')
  getAllOrdersByBuyerId(@Payload() buyerId) {
    return this.appService.getAllOrdersByBuyerId(buyerId);
  }
}
