import { PaymentModel } from '../models/Payment';
import { BaseRepository } from './base.repository';
import { IPayment } from 'shared/types';

export class PaymentRepository extends BaseRepository<IPayment> {
  constructor() {
    super(PaymentModel);
  }

  async findByOrderId(orderId: string): Promise<IPayment | null> {
    return this.findOne({ orderId });
  }

  async findByTransactionId(transactionId: string): Promise<IPayment | null> {
    return this.findOne({ transactionId });
  }
}

