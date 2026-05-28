/**
 * Order domain types
 */

export interface Order {
  id: string;
  company_id: string;
  customer_phone: string;
  customer_name?: string;
  client_name?: string;
  client_phone?: string;
  items: string;
  address: string;
  neighborhood: string;
  preferred_date: string;
  status: 'pending' | 'assigned' | 'completed';
  created_at: string;
}

export interface OrderData {
  items: string;
  address: string;
  neighborhood?: string;
  preferred_date?: string;
  client_name?: string;
  client_phone?: string;
}
