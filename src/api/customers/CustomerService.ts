import { CreateCustomerDto } from './CreateCustomerDto';
import { CustomerDto } from './CustomerDto';
import { CUSTOMER_API_URL } from '../apiconfig';
import { authenticatedApi } from '../http';

export class CustomerService {
  static async createCustomer(customer: CreateCustomerDto): Promise<CustomerDto> {
    const { data } = await authenticatedApi.post(CUSTOMER_API_URL, customer);
    return data;
  }
  static async getCustomers(page: number, pageSize: number): Promise<{ rows: CustomerDto[]; total: number }> {
    const { data } = await authenticatedApi.get(CUSTOMER_API_URL, {
      params: { offset: page * pageSize, limit: pageSize },
    });
    const customers = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(customers) || customers.some((row) => !row || !row.customerId)) {
      throw new Error('The server returned an invalid customer list.');
    }
    return Array.isArray(data)
      ? { rows: customers.slice(page * pageSize, (page + 1) * pageSize), total: customers.length }
      : { rows: customers, total: Number(data.total) || 0 };
  }
  static async getCustomerById(id: string): Promise<CustomerDto> {
    const { data } = await authenticatedApi.get(`${CUSTOMER_API_URL}/${encodeURIComponent(id)}`);
    return data;
  }
  static async updateCustomer(id: string, customer: Partial<CreateCustomerDto>): Promise<CustomerDto> {
    await authenticatedApi.patch(`${CUSTOMER_API_URL}/${encodeURIComponent(id)}`, customer);
    // Some backend versions return an update result instead of the saved record.
    return this.getCustomerById(id);
  }
  static async deleteCustomer(id: string): Promise<void> {
    await authenticatedApi.delete(`${CUSTOMER_API_URL}/${encodeURIComponent(id)}`);
  }
}
