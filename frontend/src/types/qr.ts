export interface QROptions {
  content: string;
  size: number;
  fgColor: string;
  bgColor: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  cornerStyle: 'square' | 'rounded' | 'dots';
  logo?: string;
  logoSize?: number;
}

export interface QRHistoryItem {
  id: string;
  content: string;
  options: QROptions;
  createdAt: string;
  thumbnail?: string;
}

export const defaultQROptions: QROptions = {
  content: '',
  size: 256,
  fgColor: '#00d4ff',
  bgColor: '#0a0f1a',
  errorCorrectionLevel: 'M',
  cornerStyle: 'square',
  logoSize: 50,
};
