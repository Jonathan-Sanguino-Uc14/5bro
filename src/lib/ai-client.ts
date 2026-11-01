/** Mobile client: provider credentials exist only on the AI server. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BusinessSummary {
  businessName: string;
  currentDate: string;
  today: {
    ventas: number;
    compras: number;
    gastos: number;
    gananciaEstimada: number;
    count: number;
  };
  week: {
    ventas: number;
    compras: number;
    gastos: number;
    gananciaEstimada: number;
    count: number;
  };
  month: {
    ventas: number;
    compras: number;
    gastos: number;
    gananciaEstimada: number;
    count: number;
    daysWithRecords: number;
  };
}

export type AiError = { kind: 'configuration' | 'authentication' | 'network' | 'timeout' | 'quota' | 'billing' | 'invalid' | 'service' };
export type AiResult = { ok: true; content: string };
export type AiFailure = { ok: false; error: AiError };
export function aiErrorMessage(error: AiError): string {
  const messages = {
    configuration: 'La IA todavía no está configurada. Falta conectar el servidor con OpenAI.',
    authentication: 'No se pudo autorizar la conexión con la IA. Revisa la configuración del servidor.',
    network: 'No se pudo conectar con el servidor de IA. Comprueba la conexión y que el servidor esté encendido.',
    timeout: 'La respuesta tardó demasiado. Puedes intentarlo de nuevo.',
    quota: 'El servicio está recibiendo demasiadas consultas. Espera un momento y reintenta.',
    billing: 'La cuenta de OpenAI no tiene cuota disponible. Revisa la facturación de la API.',
    invalid: 'La consulta o los datos no son válidos. Prueba con un mensaje más corto.',
    service: 'La IA no pudo completar la respuesta. Intenta nuevamente.',
  };
  return messages[error.kind];
}
export async function sendMessage(userMessage: string, history: ChatMessage[], summary: BusinessSummary): Promise<AiResult | AiFailure> {
  const url = process.env.EXPO_PUBLIC_AI_URL?.trim();
  const token = process.env.EXPO_PUBLIC_AI_DEV_TOKEN?.trim();
  if (!url || !token) return { ok: false, error: { kind: 'configuration' } };
  if (!userMessage.trim() || userMessage.length > 4000) return { ok: false, error: { kind: 'invalid' } };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: userMessage.trim(), history: history.slice(-10), summary }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const kinds = ['configuration', 'authentication', 'quota', 'billing', 'invalid', 'timeout', 'service'];
      const kind = kinds.includes(data?.error?.kind) ? data.error.kind : response.status === 429 ? 'quota' : response.status === 401 ? 'authentication' : 'service';
      return { ok: false, error: { kind } };
    }
    if (typeof data?.content !== 'string' || !data.content.trim()) return { ok: false, error: { kind: 'service' } };
    return { ok: true, content: data.content.trim() };
  } catch {
    return { ok: false, error: { kind: controller.signal.aborted ? 'timeout' : 'network' } };
  } finally { clearTimeout(timeout); }
}
