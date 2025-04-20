import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderPayload } from './types/CreateOrderPayload.interface';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { KafkaProducerService } from './kafka/producer.service';
import { KAFKA_TOPICS } from './kafka/topics';
import { Cron } from '@nestjs/schedule';

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

    // Check All the products are available in stock
    // TODO - Get Available Stock from the redis cache instead of the payload, if not available in the cache, get it from the DB
    const unavailableProducts = orderData.products.filter(
      (product) => product.availableStock < product.quantity,
    );
    if (unavailableProducts.length > 0) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message:
          'Some products are not available in stock. Cannot proceed with the order.',
        unavailableProducts,
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

  async cancelOrder(orderId: string) {
    // Get order details using orderId
    const order = await this._orderEntity.findOne({
      where: { id: orderId, status: Not('CANCELLED') },
    });

    if (!order) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Order not found',
      };
    }

    // Delete order items using order_reference
    const orderItems = await this._orderItemEntity.find({
      where: { order_reference: order.order_reference },
    });

    // Send Kafka event to update stock

    if (orderItems.length > 0) {
      orderItems.forEach(async (item) => {
        await this._kafkaProducerService
          .sendMessage(KAFKA_TOPICS.ORDER_CANCELLED, [
            {
              key: `${order.order_reference}-${item.product_id}`,
              value: JSON.stringify({
                productId: item.product_id,
                quantity: item.quantity,
              }),
            },
          ])
          .catch((err) => {
            throw new Error(
              `Error sending Kafka message - ${JSON.stringify(err)}`,
            );
          });
      });

      // Delete order items from the database
      await this._orderItemEntity.delete({
        order_reference: order.order_reference,
      });
    }
    // Update the order status to CANCELLED
    order.status = 'CANCELLED';
    const orderEntity = this._orderEntity.create(order);
    const orderResponse = await this._orderEntity.save(orderEntity);
    if (!orderResponse) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error cancelling order',
      };
    }

    // Update Cache
  }

  // Update Pending Status Cron Job - Every 10 minutes
  @Cron('*/10 * * * *')
  async updatePendingStatus() {
    // Get all orders with status PENDING and created more than 10 minutes ago
    const pendingOrders = await this._orderEntity.find({
      where: {
        status: 'PENDING',
      },
    });

    console.log(
      `Found ${pendingOrders.length} pending orders at ${new Date()}`,
    );

    if (pendingOrders.length > 0) {
      pendingOrders.forEach(async (order) => {
        order.status = 'COMPLETED';
        await this._orderEntity.save(order);
      });
    }
  }
}
