/**
 * Address validation tool for agent
 */

import { tool } from "ai";
import { z } from "zod";
import { geocodeAddress } from '../../geocoding';
import { kapso } from '../../whatsapp';

// Cache to prevent duplicate location sends
const recentLocationSends = new Map<string, number>();
const DUPLICATE_THRESHOLD_MS = 5000; // 5 seconds

/**
 * Create validate_address tool for the agent
 */
export function createValidateAddressTool(
  serviceArea: string,
  customerPhone?: string
) {
  return tool({
    description: 'Validate and geocode an address. Use this when the customer provides a street address. This will send a location pin to confirm the address with the customer.',
    inputSchema: z.object({
      address: z.string().describe('The full address provided by the customer (street + number + neighborhood if available)'),
    }),
    execute: async ({ address }) => {
      console.log(`🗺️ [TOOL CALLED] Geocoding address: "${address}"`);
      console.log(`📞 Customer phone: ${customerPhone}`);

      const result = await geocodeAddress(address, serviceArea);

      if (!result) {
        return {
          success: false,
          message: 'No se pudo validar la dirección. Por favor verificá que sea correcta.',
        };
      }

      // Send location pin to customer via WhatsApp
      if (customerPhone) {
        const cacheKey = `${customerPhone}:${result.formattedAddress}`;
        const lastSent = recentLocationSends.get(cacheKey);
        const now = Date.now();

        // Skip if we sent this exact location recently (within 5 seconds)
        if (lastSent && (now - lastSent) < DUPLICATE_THRESHOLD_MS) {
          console.log(`⏭️ Skipping duplicate location send (sent ${now - lastSent}ms ago)`);
        } else {
          try {
            await kapso.sendLocation({
              to: customerPhone,
              latitude: result.location.lat,
              longitude: result.location.lng,
              name: result.formattedAddress,
              address: result.formattedAddress,
            });

            recentLocationSends.set(cacheKey, now);
            console.log(`✅ Location sent: ${result.formattedAddress}`);
          } catch (error) {
            console.error('❌ Error sending location:', error);
          }
        }
      }

      return {
        success: true,
        formattedAddress: result.formattedAddress,
        neighborhood: result.neighborhood,
        city: result.city,
        coordinates: result.location,
        message: `Confirmado. La dirección es: ${result.formattedAddress}${result.neighborhood ? ` (${result.neighborhood})` : ''}. Te envié un pin con la ubicación exacta.`,
      };
    },
  });
}
