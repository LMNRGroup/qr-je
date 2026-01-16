import { QRHistoryItem, QROptions } from '@/types/qr';

// Mock API responses
const mockHistory: QRHistoryItem[] = [
  {
    id: '1',
    content: 'https://example.com',
    options: {
      content: 'https://example.com',
      size: 256,
      fgColor: '#D4AF37',
      bgColor: '#0A192F',
      errorCorrectionLevel: 'M',
      cornerStyle: 'square',
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    content: 'https://github.com',
    options: {
      content: 'https://github.com',
      size: 300,
      fgColor: '#D4AF37',
      bgColor: '#0A192F',
      errorCorrectionLevel: 'H',
      cornerStyle: 'rounded',
    },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    content: 'Hello World!',
    options: {
      content: 'Hello World!',
      size: 200,
      fgColor: '#D4AF37',
      bgColor: '#0A192F',
      errorCorrectionLevel: 'L',
      cornerStyle: 'dots',
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateQR(content: string, options: Partial<QROptions>): Promise<{ success: boolean; data?: QRHistoryItem }> {
  await delay(500);
  
  const newItem: QRHistoryItem = {
    id: crypto.randomUUID(),
    content,
    options: {
      content,
      size: options.size || 256,
      fgColor: options.fgColor || '#D4AF37',
      bgColor: options.bgColor || '#0A192F',
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      cornerStyle: options.cornerStyle || 'square',
      logo: options.logo,
      logoSize: options.logoSize,
    },
    createdAt: new Date().toISOString(),
  };

  return { success: true, data: newItem };
}

export async function getQRHistory(): Promise<{ success: boolean; data: QRHistoryItem[] }> {
  await delay(300);
  return { success: true, data: mockHistory };
}

export async function deleteQRFromHistory(id: string): Promise<{ success: boolean }> {
  await delay(200);
  return { success: true };
}
