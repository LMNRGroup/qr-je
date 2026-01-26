import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 space-y-8 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Legal</p>
            <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-2">QR Code Studio by Luminar Apps</p>
            <p className="text-sm text-muted-foreground">Last Updated: January 20, 2026</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
            aria-label="Go back"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-6 text-sm text-muted-foreground">
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
          
          <h3 className="text-sm font-semibold text-foreground mt-4">Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Email address</li>
            <li>Password (encrypted, not stored in plain text)</li>
            <li>Full name (optional)</li>
            <li>Username (optional)</li>
            <li>Timezone preference</li>
            <li>Language preference</li>
            <li>Theme preference (light/dark mode)</li>
            <li>Avatar preferences</li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4">QR Code Data</h3>
          <p>We store:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>QR code content (URLs, phone numbers, email addresses, vCard data)</li>
            <li>QR code names and customization options</li>
            <li>QR code generation settings (colors, logos, styles)</li>
            <li>File uploads (menus, PDFs, images) stored in our file storage system</li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4">Usage and Analytics Data</h3>
          <p>When QR codes are scanned, we may collect:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>IP address</li>
            <li>User agent (device and browser information)</li>
            <li>Timestamp of scan</li>
            <li>Response time</li>
            <li>Geographic location data (city, region, country) derived from IP address</li>
            <li>Device type and browser information</li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4">Technical Data</h3>
          <p>We may collect:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Session tokens and authentication data (stored locally in your browser)</li>
            <li>Preferences stored in browser localStorage</li>
            <li>Error logs and diagnostic information</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide and maintain the Service</li>
            <li>Authenticate your account and manage sessions</li>
            <li>Store and serve your QR codes and uploaded files</li>
            <li>Generate analytics and insights (Intel) about QR code performance</li>
            <li>Improve the Service and fix technical issues</li>
            <li>Respond to support requests</li>
            <li>Enforce our Terms & Conditions</li>
            <li>Comply with legal obligations</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          
          <h3 className="text-sm font-semibold text-foreground mt-4">Supabase</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Purpose:</strong> Authentication and file storage</li>
            <li><strong>Data:</strong> User accounts, authentication tokens, uploaded files (menus, PDFs, images)</li>
            <li><strong>Privacy Policy:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com/privacy</a></li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4">ipapi.co</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Purpose:</strong> Geographic location lookup for scan analytics</li>
            <li><strong>Data:</strong> IP addresses (for location estimation)</li>
            <li><strong>Privacy Policy:</strong> <a href="https://ipapi.co/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ipapi.co/privacy/</a></li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4">Email Service</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Purpose:</strong> Account verification and service communications</li>
            <li><strong>Data:</strong> Email addresses</li>
            <li><strong>Privacy Policy:</strong> <span className="text-muted-foreground/70">TODO: Add email provider privacy policy link</span></li>
          </ul>

          <p className="mt-4">We do not sell your personal information to third parties.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Data Storage and Security</h2>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Database:</strong> User data and QR codes are stored in PostgreSQL databases</li>
            <li><strong>File Storage:</strong> Uploaded files are stored in Supabase Storage</li>
            <li><strong>Security:</strong> We use industry-standard security practices including encryption, secure authentication, and access controls</li>
            <li><strong>Retention:</strong> We retain your data for as long as your account is active. You can delete your account and data at any time (see Data Deletion section)</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. Cookies and Local Storage</h2>
          <p>We use browser localStorage (not traditional cookies) to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Store authentication tokens and session data</li>
            <li>Remember your preferences (theme, language, timezone)</li>
            <li>Track storage usage locally</li>
            <li>Maintain your active session</li>
          </ul>
          <p className="mt-2">We do not use tracking cookies or third-party advertising cookies.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct your account information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data (see Data Deletion Instructions)</li>
            <li><strong>Portability:</strong> Export your QR code data</li>
            <li><strong>Opt-out:</strong> Discontinue use of the Service at any time</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us at support@luminarapps.com.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Children's Privacy</h2>
          <p>QR Code Studio is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. International Data Transfers</h2>
          <p>Your data may be processed and stored in servers located outside your country of residence. By using the Service, you consent to the transfer of your data to these locations.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">9. Data Breach Notification</h2>
          <p>In the event of a data breach that compromises your personal information, we will notify affected users and relevant authorities as required by applicable law.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">11. Contact Us</h2>
          <p>For questions about this Privacy Policy or our data practices:</p>
          <p><strong>Luminar Apps</strong></p>
          <p>Email: <a href="mailto:support@luminarapps.com" className="text-primary hover:underline">support@luminarapps.com</a></p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">12. Governing Law</h2>
          <p>This Privacy Policy is governed by the laws of the Commonwealth of Puerto Rico.</p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Privacy;
