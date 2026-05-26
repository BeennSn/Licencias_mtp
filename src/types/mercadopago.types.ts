// Tipos de Mercado Pago (Checkout Pro)

export interface MercadoPagoItem {
  id: string
  title: string
  description?: string
  quantity: number
  currency_id: 'PEN'
  unit_price: number
}

export interface MercadoPagoPreferenceRequest {
  items: MercadoPagoItem[]
  payer?: {
    name?: string
    email?: string
  }
  external_reference: string  // application_id
  back_urls: {
    success: string
    pending: string
    failure: string
  }
  auto_return?: 'approved' | 'all'
  notification_url: string    // webhook URL
  expires: boolean
  expiration_date_to?: string
}

export interface MercadoPagoPreferenceResponse {
  id: string
  init_point: string          // URL de Checkout Pro (producción)
  sandbox_init_point: string  // URL de Checkout Pro (sandbox)
}

export interface MercadoPagoWebhookBody {
  action: string              // 'payment.created' | 'payment.updated'
  api_version: string
  data: { id: string }
  date_created: string
  id: number
  live_mode: boolean
  type: string                // 'payment'
  user_id: string
}

export interface MercadoPagoPaymentDetail {
  id: number
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded'
  status_detail: string
  external_reference: string  // application_id
  transaction_amount: number
  currency_id: string
  payer: {
    email: string
  }
}
