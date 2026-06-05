const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

export async function createPreference({ items, payer, back_urls, external_reference }) {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não está configurado nas variáveis de ambiente.');
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items,
      payer,
      back_urls,
      auto_return: 'approved',
      external_reference
    })
  });
  
  if (!response.ok) {
    const err = await response.json();
    console.error('[Mercado Pago API Error] Create Preference:', err);
    throw new Error(err.message || 'Erro ao criar preferência de pagamento');
  }
  return response.json();
}

export async function createPixPayment({ transaction_amount, description, payer, external_reference }) {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não está configurado nas variáveis de ambiente.');
  }

  const payload = {
    transaction_amount: parseFloat(transaction_amount.toFixed(2)),
    description,
    payment_method_id: 'pix',
    payer: {
      email: payer.email,
      first_name: payer.first_name || 'Cliente',
      last_name: payer.last_name || 'EV Tracker'
    },
    external_reference
  };

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': 'pix_' + Math.random().toString(36).substring(2, 15) + Date.now()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('[Mercado Pago API Error] Create Pix:', err);
    throw new Error(err.message || 'Erro ao gerar pagamento Pix');
  }
  return response.json();
}

export async function getPayment(paymentId) {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não está configurado nas variáveis de ambiente.');
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('[Mercado Pago API Error] Get Payment:', err);
    throw new Error(err.message || 'Erro ao buscar pagamento');
  }
  return response.json();
}
