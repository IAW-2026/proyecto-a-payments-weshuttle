import { MercadoPagoConfig, Payment } from "mercadopago";

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn("MERCADOPAGO_ACCESS_TOKEN is not defined. Mercado Pago integration will not work.");
}

export const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "TEST-MOCK-TOKEN",
  options: { timeout: 5000 },
});

export const payment = new Payment(client);
