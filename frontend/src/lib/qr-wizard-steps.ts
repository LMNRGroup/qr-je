/**
 * Shared QR Creation Wizard Step Configuration
 * 
 * This module defines the step structure and validation logic for the QR creation wizard.
 * Used by both Mobile V2 and Desktop implementations to ensure consistent behavior.
 * 
 * Steps:
 * 1. Quick Actions (select QR type via quick action) - Optional, can skip to step 2
 * 2. Mode Selection (Static or Dynamic)
 * 3. Type Selection + Details Entry (if not selected in step 1)
 * 4. Customization (colors, style, logo)
 */

export type QRWizardStep = 1 | 2 | 3 | 4;

export type QRMode = 'static' | 'dynamic' | null;
export type QRType = 'website' | 'vcard' | 'email' | 'phone' | 'file' | 'menu' | null;

export interface QRWizardState {
  step: QRWizardStep;
  mode: QRMode;
  type: QRType;
  quickAction: string | null; // If user selected a quick action in step 1
  // Validation states
  websiteUrl: string;
  emailAddress: string;
  phoneNumber: string;
  fileUrl: string;
  fileName: string;
  vcardName: string;
  vcardSlug: string;
  menuFilesCount: number; // Number of menu files uploaded
  // Touched states for validation
  websiteTouched: boolean;
  emailTouched: boolean;
  phoneTouched: boolean;
  fileTouched: boolean;
}

export interface StepConfig {
  id: QRWizardStep;
  title: string;
  description: string;
  canProceed: (state: QRWizardState) => boolean;
  canGoBack: (state: QRWizardStep) => boolean;
}

/**
 * Validation helpers (internal)
 */
function isValidWebsiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname;
    if (!hostname.includes('.')) return false;
    if (!/^[a-z0-9.-]+$/i.test(hostname)) return false;
    const tld = hostname.split('.').pop();
    if (!tld || tld.length < 2) return false;
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7;
}

/**
 * Validates if the current step can proceed to the next step
 */
export function canProceedFromStep(step: QRWizardStep, state: QRWizardState): boolean {
  switch (step) {
    case 1:
      // Step 1 (Quick Actions) is optional - can always proceed
      return true;
    case 2:
      // Step 2 requires mode selection
      return state.mode !== null;
    case 3:
      // Step 3 requires type selection and valid content based on type
      if (!state.type) return false;
      
      switch (state.type) {
        case 'website':
          return isValidWebsiteUrl(state.websiteUrl);
        case 'email':
          return isValidEmail(state.emailAddress);
        case 'phone':
          return isValidPhone(state.phoneNumber);
        case 'file':
          return Boolean(state.fileUrl && state.fileName);
        case 'menu':
          return Boolean(state.menuFilesCount > 0); // Menu files uploaded
        case 'vcard':
          return Boolean(state.vcardName); // Name is required
        default:
          return false;
      }
    case 4:
      // Step 4 (Customization) can always proceed - it's optional
      return true;
    default:
      return false;
    }
}

/**
 * Determines the effective step based on state
 * If quick action is selected, we can skip step 1
 */
export function getEffectiveStep(state: QRWizardState): QRWizardStep {
  if (state.quickAction && state.step === 1) {
    return 2; // Skip to mode selection if quick action selected
  }
  return state.step;
}

/**
 * Gets the next valid step based on current state
 */
export function getNextStep(currentStep: QRWizardStep, state: QRWizardState): QRWizardStep | null {
  if (currentStep >= 4) return null; // Already at last step
  
  const nextStep = (currentStep + 1) as QRWizardStep;
  
  // If quick action is selected and we're at step 1, go to step 2
  if (currentStep === 1 && state.quickAction) {
    return 2;
  }
  
  return nextStep;
}

/**
 * Gets the previous valid step
 */
export function getPreviousStep(currentStep: QRWizardStep, state: QRWizardState): QRWizardStep | null {
  if (currentStep <= 1) return null;
  
  // If quick action is selected, we can't go back to step 1
  if (currentStep === 2 && state.quickAction) {
    return null; // Can't go back to step 1 if quick action was used
  }
  
  return (currentStep - 1) as QRWizardStep;
}


/**
 * Step configuration
 */
export const STEP_CONFIG: Record<QRWizardStep, StepConfig> = {
  1: {
    id: 1,
    title: 'Quick Actions',
    description: 'Pick the QR type you want to create.',
    canProceed: () => true, // Step 1 is optional
    canGoBack: () => false, // Can't go back from step 1
  },
  2: {
    id: 2,
    title: 'QR Mode',
    description: 'Choose whether your QR code is static or dynamic.',
    canProceed: (state) => state.mode !== null,
    canGoBack: (step) => step > 1,
  },
  3: {
    id: 3,
    title: 'Content & Customization',
    description: 'Enter content or customize based on your QR type.',
    canProceed: (state) => canProceedFromStep(3, state),
    canGoBack: (step) => step > 1,
  },
  4: {
    id: 4,
    title: 'QR Customization',
    description: 'Customize colors, style, and logo for your QR code.',
    canProceed: () => true, // Customization is optional
    canGoBack: (step) => step > 1,
  },
};
