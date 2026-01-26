import { Mail, Clock, HelpCircle, FileText, Shield, CreditCard, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const Support = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="container mx-auto px-4 py-12 space-y-8 max-w-4xl">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Help & Support</p>
        <h1 className="text-3xl font-semibold tracking-tight">Support & Contact</h1>
        <p className="text-sm text-muted-foreground mt-2">QR Code Studio by Luminar Apps</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Email Support</h2>
              <p className="text-sm text-muted-foreground mb-2">
                <a href="mailto:support@luminarapps.com" className="text-primary hover:underline font-medium">
                  support@luminarapps.com
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                We aim to respond to all support requests within 24-48 hours during business days (Monday-Friday, 9 AM - 5 PM AST).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-border/50">
            <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Response Times</h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>General inquiries:</strong> 24-48 hours</li>
                <li><strong>Technical issues:</strong> 24-48 hours</li>
                <li><strong>Account issues:</strong> 24-48 hours</li>
                <li><strong>Data deletion requests:</strong> 48-72 hours (see <Link to="/data-deletion" className="text-primary hover:underline">Data Deletion Instructions</Link>)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Common Help Topics</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Account & Authentication</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>Forgot password:</strong> Use the "Forgot my password" link on the login page. <span className="text-muted-foreground/70">TODO: Confirm if password reset email flow is implemented.</span></li>
              <li><strong>Account creation:</strong> Sign up requires email verification. Check your inbox for the verification email.</li>
              <li><strong>Username changes:</strong> Usernames can be changed once every 30 days from your Config/Preferences page.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">QR Code Creation</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>Static vs Dynamic:</strong> Static QR codes are permanent and can't be changed after printing. Dynamic QR codes can be updated anytime and include analytics.</li>
              <li><strong>File uploads:</strong> Maximum file size is 10MB per file. Total storage limit is 25MB per user (free plan).</li>
              <li><strong>Menu QR codes:</strong> Upload up to 15 menu pages. Supports images (JPG, PNG) and PDFs.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Analytics & Intel</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>Viewing analytics:</strong> Go to the Intel tab to see scan data, trends, and geographic information.</li>
              <li><strong>Geographic data:</strong> Location is estimated from IP addresses and is accurate to city/region level, not exact addresses.</li>
              <li><strong>Export data:</strong> Data export is available on Pro and Command plans.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Technical Issues</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>QR code not scanning:</strong> Ensure the QR code is printed at least 1 inch (2.5 cm) square with good contrast. Test scan before mass printing.</li>
              <li><strong>File upload errors:</strong> Check file size limits (10MB per file). Ensure you're signed in for file uploads.</li>
              <li><strong>Storage errors:</strong> Verify you haven't exceeded your 25MB storage limit. Delete unused QR codes or files to free up space.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Billing & Plans</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>Free plan features:</strong> Unlimited static QR codes, 1 dynamic QR code, 1 Adaptive QRC™ (expires after 30 days), basic Intel.</li>
              <li><strong>Pro plan features:</strong> 25 dynamic QR codes, 1 Adaptive QRC™ (never expires), full Intel, no watermarks, bulk creation.</li>
              <li><strong>Upgrading:</strong> Contact support@luminarapps.com to upgrade your plan.</li>
              <li><strong>Cancellation:</strong> You can cancel Pro at any time. Your QR codes will continue to work, but Pro features will be removed.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Data & Privacy</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>Data deletion:</strong> See our <Link to="/data-deletion" className="text-primary hover:underline">Data Deletion Instructions</Link> for how to request account and data deletion.</li>
              <li><strong>Privacy questions:</strong> See our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details on data collection and usage.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Before Contacting Support</h2>
        </div>
        <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
          <li><strong>Check the FAQ:</strong> Many common questions are answered in our FAQ.</li>
          <li><strong>Check your account:</strong> Verify you're signed in and your account is active.</li>
          <li><strong>Clear browser cache:</strong> Try clearing your browser cache and localStorage if experiencing issues.</li>
          <li><strong>Try a different browser:</strong> Some issues may be browser-specific.</li>
        </ol>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Reporting Issues</h2>
        </div>
        <p className="text-sm text-muted-foreground">When reporting a technical issue, please include:</p>
        <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
          <li>Description of the problem</li>
          <li>Steps to reproduce</li>
          <li>Browser and device information</li>
          <li>Screenshots (if applicable)</li>
          <li>Your account email (if account-related)</li>
        </ul>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">Business Hours</h2>
        <p className="text-sm text-muted-foreground">
          Support is available Monday-Friday, 9 AM - 5 PM Atlantic Standard Time (AST). We do not provide 24/7 support at this time.
        </p>
      </div>

      <div className="text-center text-sm text-muted-foreground space-y-2 pt-4">
        <p><strong>Luminar Apps</strong></p>
        <p>Email: <a href="mailto:support@luminarapps.com" className="text-primary hover:underline">support@luminarapps.com</a></p>
        <p>© 2026 Luminar Apps. All rights reserved.</p>
      </div>
    </div>
  </div>
);

export default Support;
