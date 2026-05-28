/**
 * Type definitions for application data structures
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

export interface SavedRoute {
  id: string;
  driver_label: string;
  orders: Order[];
  created_at: string;
  center: {
    lat: number;
    lng: number;
  };
}
