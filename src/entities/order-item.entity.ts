import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_reference: string;

  @Column('uuid')
  product_id: string;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  order_item_price: number;
}
