import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const Terms = () => {
  const navigate = useNavigate();
  
  return (
  <div className="min-h-screen bg-background text-foreground">
    <div className="container mx-auto px-4 py-12 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mt-2">QR Code Studio by Luminar Apps</p>
        <p className="text-sm text-muted-foreground">Last Updated: January 16, 2026</p>
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
          <h2 className="text-base font-semibold text-foreground">1. Agreement to Terms</h2>
          <p>
            These Terms and Conditions ("Terms") constitute a legally binding agreement between you
            ("User," "you," or "your") and Luminar Apps ("Company," "we," "us," or "our") governing
            your access to and use of the QR Code Studio by Luminar Apps application, website,
            platform, and related services (collectively, the "Service").
          </p>
          <p>
            By accessing or using the Service, you acknowledge that you have read, understood, and
            agreed to be bound by these Terms. If you do not agree, you must immediately discontinue
            use of the Service.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. Eligibility</h2>
          <p>
            You must be at least 18 years of age to use this Service. By using the Service, you
            represent and warrant that you meet this requirement and have the legal capacity to
            enter into this agreement.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Description of Service</h2>
          <p>
            QR Code Studio by Luminar Apps provides tools for generating, managing, customizing, and
            deploying QR codes and related digital content.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Modify, suspend, or discontinue any feature or part of the Service at any time</li>
            <li>Add or remove functionalities without notice</li>
            <li>Limit usage, storage, or access at our sole discretion</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. User Accounts</h2>
          <p>You may be required to create an account to access certain features.</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities occurring under your account</li>
            <li>Any content generated, uploaded, or distributed using the Service</li>
          </ul>
          <p>
            We are not liable for unauthorized access resulting from your failure to safeguard
            credentials.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. User Content & Responsibility</h2>
          <p>
            You retain ownership of any content you generate or upload through the Service ("User
            Content").
          </p>
          <p>
            By using the Service, you grant Luminar Apps a non-exclusive, worldwide, royalty-free,
            sublicensable license to host, store, process, display, and distribute User Content
            solely for the purpose of operating and improving the Service.
          </p>
          <p>You agree not to use the Service to create, distribute, or promote content that is:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Illegal, fraudulent, or misleading</li>
            <li>Harmful, abusive, defamatory, or obscene</li>
            <li>Infringing on intellectual property rights</li>
            <li>Used for phishing, malware, scams, or deceptive practices</li>
          </ul>
          <p>We reserve the right to remove content or suspend accounts at our sole discretion.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Prohibited Uses</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Reverse engineer, decompile, or exploit the Service</li>
            <li>Circumvent security or access controls</li>
            <li>Use the Service for unlawful or unauthorized purposes</li>
            <li>Interfere with system integrity or performance</li>
            <li>Resell or redistribute the Service without written permission</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Intellectual Property</h2>
          <p>
            All software, branding, trademarks, logos, designs, and content related to the Service
            are the exclusive property of Luminar Apps.
          </p>
          <p>QR Code Studio by Luminar Apps © 2026 Luminar Apps. All rights reserved.</p>
          <p>
            Nothing in these Terms grants you ownership rights to any intellectual property owned by
            Luminar Apps.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Disclaimers</h2>
          <p>The Service is provided "as is" and "as available."</p>
          <p>We make no warranties, express or implied, including but not limited to:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Merchantability</li>
            <li>Fitness for a particular purpose</li>
            <li>Accuracy or reliability</li>
            <li>Availability or uptime</li>
          </ul>
          <p>We do not guarantee that:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>QR codes will function indefinitely</li>
            <li>Content will remain accessible</li>
            <li>The Service will be uninterrupted or error-free</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Luminar Apps shall not be liable for any:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Direct or indirect damages</li>
            <li>Loss of data, revenue, profits, or business</li>
            <li>Service interruptions</li>
            <li>Misuse of QR codes generated through the Service</li>
            <li>Third-party actions or content</li>
          </ul>
          <p>Your sole remedy is to discontinue use of the Service.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">10. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Luminar Apps, its affiliates, officers,
            employees, and partners from any claims, damages, liabilities, or expenses arising from:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Your use of the Service</li>
            <li>Your User Content</li>
            <li>Your violation of these Terms</li>
            <li>Any third-party claims related to QR codes you generate or distribute</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">11. Third-Party Services</h2>
          <p>The Service may integrate or link to third-party services. We are not responsible for:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Third-party content</li>
            <li>External websites or services</li>
            <li>Data handling or privacy practices of third parties</li>
          </ul>
          <p>Use of third-party services is at your own risk.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">12. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account, restrict access, or remove
            content at any time, with or without notice, for any reason, including violation of
            these Terms.
          </p>
          <p>Upon termination, your right to use the Service immediately ceases.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">13. Data & Privacy</h2>
          <p>
            Use of the Service is also governed by our Privacy Policy. By using the Service, you
            consent to the collection and use of data in accordance with applicable laws and our
            internal practices.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">14. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Continued use of the Service after changes are
            posted constitutes acceptance of the revised Terms.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">15. Governing Law</h2>
          <p>
            These Terms shall be governed and interpreted in accordance with the laws of the
            Commonwealth of Puerto Rico, without regard to conflict of law principles.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">16. Severability</h2>
          <p>
            If any provision of these Terms is found unenforceable, the remaining provisions shall
            remain in full force and effect.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">17. Entire Agreement</h2>
          <p>
            These Terms constitute the entire agreement between you and Luminar Apps regarding use
            of the Service and supersede any prior agreements or understandings.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">18. Contact Information</h2>
          <p>For questions regarding these Terms:</p>
          <p>Luminar Apps</p>
          <p>Email: support@luminarapps.com</p>
        </div>
      </div>
    </div>
  </div>
);
};

export default Terms;
