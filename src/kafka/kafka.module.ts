import { Module } from '@nestjs/common';
import { KafkaProducerService } from './producer.service';

@Module({
  controllers: [],
  providers: [KafkaProducerService],
})
export class KafkaModule {}
