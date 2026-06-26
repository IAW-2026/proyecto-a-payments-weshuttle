import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

let mercadoPagoClient: MercadoPagoConfig | null = null;

function getAccessToken() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

  return accessToken ? accessToken : null;
}

export function isMercadoPagoConfigured() {
  return getAccessToken() !== null;
}

function getMercadoPagoClient() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not defined.");
  }

  if (!mercadoPagoClient) {
    mercadoPagoClient = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });
  }

  return mercadoPagoClient;
}

export function getPreferenceClient() {
  return new Preference(getMercadoPagoClient());
}

export function getPaymentClient() {
  return new Payment(getMercadoPagoClient());
}
