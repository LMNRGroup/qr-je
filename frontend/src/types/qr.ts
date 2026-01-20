export interface QROptions {
  content: string;
  size: number;
  fgColor: string;
  bgColor: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  cornerStyle: 'square' | 'rounded' | 'dots';
  logo?: string;
  logoSize?: number;
  logoWidth?: number;
  logoHeight?: number;
  logoAspect?: number;
  fileName?: string;
  fileUrl?: string;
  menuFiles?: { url: string; type: 'image' | 'pdf' }[];
  menuType?: 'restaurant' | 'service';
  menuLogoDataUrl?: string;
  menuSocials?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
}

export interface QRHistoryItem {
  id: string;
  random?: string;
  content: string;
  options: QROptions;
  createdAt: string;
  shortUrl?: string;
  name?: string | null;
  kind?: string | null;
  thumbnail?: string;
}

export const defaultQROptions: QROptions = {
  content: '',
  size: 256,
  fgColor: '#2B2B2B',
  bgColor: '#F3F3F0',
  errorCorrectionLevel: 'M',
  cornerStyle: 'square',
  logoSize: 50,
};
