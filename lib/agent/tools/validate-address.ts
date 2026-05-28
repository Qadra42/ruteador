/**
 * Address validation tool for agent
 */

import { tool } from "ai";
import { z } from "zod";
import { geocodeAddress } from '../../geocoding';
import { kapso } from '../../whatsapp';

/**
 * Create validate_address tool for the agent
 */
export function createValidateAddressTool(
  serviceArea: string,
  customerPhone?: string
) {
  return tool({
    description: 'Validate and geocode an address. Use this when the customer provides a street address. This will send a location pin to confirm the address with the customer.',
    parameters: z.object({
      address: z.string().describe('The full address provided by the customer (street + number + neighborhood if available)'),
    }),
    // @ts-ignore - Tool execute type compatibility issue with AI SDK 6.x
    execute: async (params) => {
      const address = params.address;
      console.log(`🗺️ Geocoding address: "${address}"`);

      const result = await geocodeAddress(address, serviceArea);

      if (!result) {
        return {
          success: false,
          message: 'No se pudo validar la dirección. Por favor verificá que sea correcta.',
        };
      }

      // Send location pin to customer via WhatsApp (only for WhatsApp, not Telegram)
      if (customerPhone) {
        try {
          await kapso.sendLocation({
            to: customerPhone,
            latitude: result.location.lat,
            longitude: result.location.lng,
            name: result.formattedAddress,
            address: result.formattedAddress,
          });

          console.log(`✅ Location sent: ${result.formattedAddress}`);
        } catch (error) {
          console.error('❌ Error sending location:', error);
        }
      }

      return {
        success: true,
        formattedAddress: result.formattedAddress,
        neighborhood: result.neighborhood,
        city: result.city,
        coordinates: result.location,
      };
    },
  });
}
