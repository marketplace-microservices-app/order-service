import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { KafkaModule } from './kafka/kafka.module';
import { KafkaProducerService } from './kafka/producer.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '123',
      database: 'orders',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]),
    KafkaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, KafkaProducerService],
})
export class AppModule {}
