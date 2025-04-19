import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, KafkaConfig, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    const config: KafkaConfig = {
      clientId: 'order-service',
      brokers: ['localhost:9092'],
    };

    this.kafka = new Kafka(config);
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    console.log('Order Service : Kafka Producer Connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    console.log('Order Service : Kafka Producer Disconnected');
  }

  async sendMessage(
    topic: string,
    messages: { key?: string; value: string }[],
  ) {
    await this.producer.send({
      topic,
      messages,
    });
  }
}
