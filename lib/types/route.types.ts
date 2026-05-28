/**
 * Route domain types
 */

import type { Order } from './order.types';

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

export interface RouteParams {
  orders: any[];
  driverLabel: string;
  companyId: string;
  driverCount: string;
  googleMapsUrl?: string;
}
