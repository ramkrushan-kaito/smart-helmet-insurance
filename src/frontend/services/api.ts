import axios from 'axios';

export const TOKEN_KEY = 'helmqr_token';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url ?? '');
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem(TOKEN_KEY);
      const dest = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
      if (window.location.pathname !== dest) window.location.assign(dest);
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
    if (!error.response) return 'The server is not reachable. Start the API and confirm PostgreSQL is running.';
  }
  return 'Something went wrong. Please try again.';
}

export function cleanName(value?: string | null) {
  return (value ?? '').replace(/^DEMO DATA\s+/i, '').trim();
}

export function money(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function when(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function day(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

export function readToken(input: string) {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const index = parts.lastIndexOf('scan');
    if (index >= 0 && parts[index + 1]) return decodeURIComponent(parts[index + 1]);
  } catch {
    /* plain token */
  }
  return trimmed;
}

export async function downloadAuthenticated(path: string, filename: string) {
  const response = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function printQrImage(id: string, helmetCode: string) {
  const response = await api.get(`/qr-codes/${id}/download`, { responseType: 'blob' });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(response.data);
  });
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640');
  if (!popup) return;
  popup.document.write(`<!doctype html><title>${helmetCode} QR</title>
    <body style="font-family:sans-serif;text-align:center;padding:24px">
      <p style="letter-spacing:.08em;color:#667">DEMO DATA</p>
      <h1>${helmetCode}</h1>
      <img src="${dataUrl}" alt="QR code for ${helmetCode}" width="320" height="320" />
      <p>Scan to verify this helmet. No personal data is stored in the code.</p>
      <script>window.onload = () => window.print()<\/script>
    </body>`);
  popup.document.close();
}
