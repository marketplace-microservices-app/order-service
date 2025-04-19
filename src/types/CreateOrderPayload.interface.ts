export interface CreateOrderPayload {
  buyerId: string;
  products: PurchasedProducts[];
}

export interface PurchasedProducts {
  productId: string;
  quantity: number;
  itemPrice: number;
  availableStock: number;
}
