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
  fgColor: '#D4AF37',
  bgColor: '#0A192F',
  errorCorrectionLevel: 'M',
  cornerStyle: 'square',
  logoSize: 50,
};
