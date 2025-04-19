import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'order-service-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  const PORT = 3004;
  await app.listen(PORT);
  console.log(`Started order microservice on ${PORT}`);
}
bootstrap();
