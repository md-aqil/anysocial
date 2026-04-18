'use client';

import { Shield, Lock, Eye, Database, Mail, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: April 18, 2026</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              SEO Genie (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our social media management platform.
            </p>
            <p>
              By accessing or using our Service, you agree to this Privacy Policy. If you do not agree 
              with the terms of this policy, please do not access our Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">Personal Information</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Name and email address</li>
                <li>Account credentials</li>
                <li>Profile information from connected social accounts</li>
                <li>Payment information (processed securely via third-party)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Provide, maintain, and improve our Services</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              We implement appropriate technical and organizational security measures to protect 
              your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure data storage with industry-standard practices</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Information Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>We may share your information with:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Service Providers:</strong> Third-party vendors who assist us in operating our Services</li>
              <li><strong>Social Media Platforms:</strong> When you connect accounts, we share necessary data with those platforms</li>
              <li><strong>Legal Requirements:</strong> When required by law or in response to valid requests</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            </ul>
            <p className="text-sm">
              We never sell your personal information to third parties for marketing purposes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Your Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Request correction of inaccurate personal data</li>
              <li>Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
              <li>Object to processing of your personal data</li>
              <li>Request restriction of processing</li>
              <li>Data portability - receive your data in a structured format</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-sm">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@seogenie.app" className="text-primary hover:underline">
                privacy@seogenie.app
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Children&apos;s Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Our Services are not intended for children under 13 years of age. We do not 
              knowingly collect personal information from children under 13. If you become 
              aware that a child has provided us with personal information, please contact us.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any 
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
            <p>
              We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Email: privacy@seogenie.app</li>
              <li>Through our website: seogenie.app</li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}