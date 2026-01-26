export interface AdaptiveSlot {
  id: string;
  name?: string;
  url?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: 'image' | 'pdf';
}

export interface AdaptiveRule {
  slot?: string;
  startDate?: string;
  endDate?: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
}

export interface AdaptiveConfig {
  slots?: AdaptiveSlot[];
  defaultSlot?: string;
  dateRules?: AdaptiveRule[];
  firstReturn?: {
    enabled?: boolean;
    firstSlot?: string;
    returnSlot?: string;
  };
  admin?: {
    enabled?: boolean;
    ips?: string[];
    slot?: string;
  };
  timezone?: string;
}

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
  fileSize?: number; // Compressed file size in bytes
  menuFiles?: { url: string; type: 'image' | 'pdf'; size: number }[]; // size is compressed file size in bytes
  menuType?: 'restaurant' | 'service';
  menuLogoDataUrl?: string;
  menuLogoSize?: number; // Compressed logo size in bytes
  menuSocials?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
  // Adaptive QR Code configuration
  adaptive?: AdaptiveConfig;
  // Portal configuration
  portalLinks?: Array<{ url: string; name: string }>;
  portalTitle?: string;
  portalDescription?: string;
  portalTemplate?: number;
  portalCustomization?: {
    backgroundColor: string;
    backgroundImage?: string;
    buttonColor: string;
    buttonStyle: 'square' | 'rounded' | 'minimal';
    fontFamily: string;
    fontColor: string;
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
