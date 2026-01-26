import { Trash2, Mail, AlertTriangle, Clock, Shield, FileX } from 'lucide-react';
import { Link } from 'react-router-dom';

const DataDeletion = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="container mx-auto px-4 py-12 space-y-8 max-w-4xl">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Privacy</p>
        <h1 className="text-3xl font-semibold tracking-tight">Data Deletion Instructions</h1>
        <p className="text-sm text-muted-foreground mt-2">QR Code Studio by Luminar Apps</p>
        <p className="text-sm text-muted-foreground">Last Updated: January 20, 2026</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-6 text-sm text-muted-foreground">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Your Right to Data Deletion</h2>
              <p>
                You have the right to request deletion of your account and all associated data. This document explains what data is deleted, what may be retained, and how to make a deletion request.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-start gap-3">
            <Trash2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">What Data Will Be Deleted</h2>
              <p className="mb-3">When you request account deletion, we will delete:</p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Account Information</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Email address</li>
                <li>Full name</li>
                <li>Username</li>
                <li>Password (encrypted)</li>
                <li>Account preferences (timezone, language, theme, avatar settings)</li>
                <li>Authentication tokens and session data</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">QR Code Data</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>All QR codes you created</li>
                <li>QR code names, content, and customization settings</li>
                <li>Short URLs and redirect configurations</li>
                <li>QR code generation history</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Uploaded Files</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Menu files (images, PDFs)</li>
                <li>File QR code uploads</li>
                <li>vCard photos</li>
                <li>Menu logos</li>
                <li>Any other files stored in your account</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Analytics Data</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>All scan records associated with your QR codes</li>
                <li>Geographic location data</li>
                <li>Device and browser information</li>
                <li>Response time data</li>
                <li>Scan trends and statistics</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">vCard Data</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>vCard records and associated data</li>
                <li>vCard photos and customizations</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <h2 className="text-base font-semibold text-foreground">What May Be Retained</h2>
          <p>The following data may be retained for legal or operational reasons:</p>
          
          <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Legal Compliance</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Transaction records (if applicable) may be retained as required by law</li>
            <li>Records of Terms & Conditions acceptance may be retained for legal purposes</li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Aggregated Analytics</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Aggregated, anonymized scan statistics (no personal identifiers)</li>
            <li>System logs without personal information</li>
          </ul>

          <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Backup Systems</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Data in automated backups may persist until backup rotation cycles complete (typically 30-90 days)</li>
          </ul>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">How to Request Deletion</h2>
              
              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Option 1: Self-Service (If Available)</h3>
              <p className="text-muted-foreground/70 mb-4">
                TODO: Confirm if self-service account deletion is implemented in the app. If yes, describe the process here.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Option 2: Email Request</h3>
              <p>Send an email to <a href="mailto:support@luminarapps.com" className="text-primary hover:underline font-medium">support@luminarapps.com</a> with:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                <li>Subject line: "Account Deletion Request"</li>
                <li>Your account email address</li>
                <li>Confirmation that you want to permanently delete your account and all data</li>
                <li>Any specific concerns or questions</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">Deletion Process Timeline</h2>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li><strong>Request received:</strong> We acknowledge your request within 24-48 hours</li>
                <li><strong>Verification:</strong> We may verify your identity to protect your account</li>
                <li><strong>Deletion:</strong> Account and data deletion begins within 48-72 hours</li>
                <li><strong>Confirmation:</strong> You receive confirmation when deletion is complete</li>
              </ol>
              <p className="mt-3 font-medium">
                <strong>Total timeline:</strong> Typically 3-5 business days from request to completion.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">Important Considerations</h2>
              
              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Before Deleting Your Account</h3>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li><strong>Export your data:</strong> If you want to keep any QR codes or analytics, export or download them before deletion</li>
                <li><strong>Update printed materials:</strong> If you have printed QR codes, they will stop working after deletion. Consider updating or removing them</li>
                <li><strong>Cancel subscriptions:</strong> If you have an active Pro or Command subscription, cancel it separately to avoid charges</li>
                <li><strong>Backup files:</strong> Download any uploaded files (menus, PDFs) you want to keep</li>
              </ol>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">After Deletion</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Account cannot be recovered:</strong> Deleted accounts cannot be restored</li>
                <li><strong>QR codes stop working:</strong> All your QR codes will immediately stop redirecting</li>
                <li><strong>Files are removed:</strong> All uploaded files are permanently deleted</li>
                <li><strong>Analytics are lost:</strong> All scan data and analytics are permanently deleted</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Partial Deletion</h3>
              <p>If you only want to delete specific QR codes or files (not your entire account):</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                <li>You can delete individual QR codes from your Arsenal</li>
                <li>Deleting a QR code also deletes associated files and scan data for that QR code</li>
                <li>This does not delete your account</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <h2 className="text-base font-semibold text-foreground">Verification Process</h2>
          <p>
            To protect your account, we may require verification before processing deletion:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Email confirmation from your registered email address</li>
            <li>Additional identity verification for sensitive accounts (if applicable)</li>
          </ul>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <h2 className="text-base font-semibold text-foreground">Questions About Deletion</h2>
          <p>
            If you have questions about the deletion process or what data will be deleted, contact us at{' '}
            <a href="mailto:support@luminarapps.com" className="text-primary hover:underline">support@luminarapps.com</a>{' '}
            before submitting a deletion request.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-start gap-3">
            <FileX className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Data Deletion for EU/UK Users</h2>
              <p>
                If you are located in the European Union or United Kingdom, you have additional rights under GDPR:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
              </ul>
              <p className="mt-2">
                These rights are in addition to the deletion process described above. Contact{' '}
                <a href="mailto:support@luminarapps.com" className="text-primary hover:underline">support@luminarapps.com</a>{' '}
                to exercise these rights.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p><strong>Luminar Apps</strong></p>
          <p>
            Email: <a href="mailto:support@luminarapps.com" className="text-primary hover:underline">support@luminarapps.com</a>
          </p>
          <p>Subject: Account Deletion Request</p>
        </div>
      </div>
    </div>
  </div>
);

export default DataDeletion;
