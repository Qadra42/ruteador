/**
 * Routes service - Business logic
 */

import type { RouteParams } from '../types';
import * as routesRepo from './routes.repository';

/**
 * Save a route to Postgres for map visualization
 */
export async function saveRouteForMap(params: RouteParams) {
  return routesRepo.insertRoute(params);
}

/**
 * Get a saved route by ID
 */
export async function getRoute(routeId: string) {
  return routesRepo.findRouteById(routeId);
}
