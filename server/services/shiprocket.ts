import { logger } from '../utils/logger';

const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in';

let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

export async function shiprocketAuth(): Promise<string> {
  // Return cached token if valid (buffer of 5 minutes)
  if (cachedToken && Date.now() < tokenExpiryTime - 5 * 60 * 1000) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error('Shiprocket credentials missing in environment variables.');
  }

  try {
    const response = await fetch(`${SHIPROCKET_BASE_URL}/v1/external/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Shiprocket auth failed: ${data.message || response.statusText}`);
    }

    cachedToken = data.token;
    // Token is valid for 10 days, setting expiry to 9 days to be safe
    tokenExpiryTime = Date.now() + 9 * 24 * 60 * 60 * 1000;

    return cachedToken as string;
  } catch (error: any) {
    logger.error(error, 'Shiprocket Auth Error');
    throw error;
  }
}

async function fetchWithRetry(endpoint: string, options: any = {}, isRetry = false): Promise<any> {
  const token = await shiprocketAuth();
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${SHIPROCKET_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json() as any;

  if (response.status === 401 && !isRetry) {
    // Token might have been manually revoked or expired early. Force refresh.
    cachedToken = null;
    return fetchWithRetry(endpoint, options, true);
  }

  if (!response.ok) {
    throw new Error(`Shiprocket API error: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function createShiprocketOrder(orderData: any) {
  // orderData needs to be mapped to Shiprocket's expected format
  return fetchWithRetry('/v1/external/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export async function assignAwb(shipmentId: string | number) {
  return fetchWithRetry('/v1/external/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId }),
  });
}

export async function generatePickup(shipmentId: string | number) {
  return fetchWithRetry('/v1/external/courier/generate/pickup', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
}

export async function generateLabel(shipmentId: string | number) {
  return fetchWithRetry('/v1/external/courier/generate/label', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
}

export async function generateManifest(shipmentId: string | number) {
  return fetchWithRetry('/v1/external/manifests/generate', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
}

export async function generateInvoice(orderId: string | number) {
  return fetchWithRetry('/v1/external/orders/print/invoice', {
    method: 'POST',
    body: JSON.stringify({ ids: [orderId] }),
  });
}

export async function trackShipment(awbCode: string) {
  return fetchWithRetry(`/v1/external/courier/track/awb/${awbCode}`, {
    method: 'GET',
  });
}

export async function checkServiceability(pincode: string, weight: number, cod: 1 | 0) {
  const pickupPostcode = process.env.SHIPROCKET_PICKUP_PINCODE || '700001'; // Fallback
  return fetchWithRetry(`/v1/external/courier/serviceability/?pickup_postcode=${pickupPostcode}&delivery_postcode=${pincode}&weight=${weight}&cod=${cod}`, {
    method: 'GET',
  });
}
