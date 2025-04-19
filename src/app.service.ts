import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderPayload } from './types/CreateOrderPayload.interface';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { KafkaProducerService } from './kafka/producer.service';
import { KAFKA_TOPICS } from './kafka/topics';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(OrderEntity)
    private _orderEntity: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private _orderItemEntity: Repository<OrderItemEntity>,
    private _kafkaProducerService: KafkaProducerService,
  ) {}

  async createOrder(orderData: CreateOrderPayload) {
    // Get the next sequence number for the order reference
    const nextVal = await this._orderEntity.query(
      `SELECT nextval('order_reference_seq')`,
    );
    const orderRef = `ORDER-#${nextVal[0].nextval}`;

    // Create the Order in orders table
    const order = {
      order_reference: orderRef,
      buyer_id: orderData.buyerId,
      status: 'PENDING',
    };

    const orderEntity = this._orderEntity.create(order);
    const orderResponse = await this._orderEntity.save(orderEntity);

    if (!orderResponse) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating order',
      };
    }

    // Get the Reference Order and add the data to order_items table
    orderData.products.forEach(async (product) => {
      const orderItem = {
        order_reference: orderRef,
        product_id: product.productId,
        quantity: product.quantity,
        order_item_price: product.itemPrice,
      };

      const orderItemEntity = this._orderItemEntity.create(orderItem);
      await this._orderItemEntity.save(orderItemEntity).catch((err) => {
        throw new Error(`Error creating order item - ${JSON.stringify(err)}`);
      });

      // Update the stock of the products in the products table - Send Kafka Event
      await this._kafkaProducerService
        .sendMessage(KAFKA_TOPICS.ORDER_CREATED, [
          {
            key: `${orderRef}-${product.productId}`,
            value: JSON.stringify({
              productId: product.productId,
              quantity: product.quantity,
            }),
          },
        ])
        .catch((err) => {
          throw new Error(
            `Error sending Kafka message - ${JSON.stringify(err)}`,
          );
        });
    });

    return {
      status: HttpStatus.CREATED,
      message: 'Order created successfully',
      order_reference: orderRef,
    };

    // Update Cache
  }
}
