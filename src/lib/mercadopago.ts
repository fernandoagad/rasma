import { MercadoPagoConfig, Preference, Payment as MpPayment } from "mercadopago";

function getClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured");
  }
  return new MercadoPagoConfig({ accessToken });
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function createCheckoutPreference(params: {
  paymentId: string;
  patientName: string;
  amount: number; // CLP (pesos, not cents)
  description: string;
}) {
  const client = getClient();
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.paymentId,
          title: params.description,
          quantity: 1,
          unit_price: params.amount,
          currency_id: "CLP",
        },
      ],
      external_reference: params.paymentId,
      back_urls: {
        success: `${APP_URL}/pagos?mp_status=success`,
        failure: `${APP_URL}/pagos?mp_status=failure`,
        pending: `${APP_URL}/pagos?mp_status=pending`,
      },
      auto_return: "approved",
      notification_url: `${APP_URL}/api/webhooks/mercadopago`,
    },
  });

  return {
    preferenceId: result.id!,
    initPoint: result.init_point!,
    sandboxInitPoint: result.sandbox_init_point!,
  };
}

export async function getMpPayment(mpPaymentId: string) {
  const client = getClient();
  const payment = new MpPayment(client);
  return payment.get({ id: mpPaymentId });
}
