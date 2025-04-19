import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_reference: string;

  @Column('uuid')
  buyer_id: string;

  @Column()
  status: string;
}
