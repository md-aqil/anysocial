
'use client';

import { Shield, Lock, Eye, Database, Mail, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold">Terms of Service</h1>
                    <p className="text-muted-foreground">Last updated: May 13, 2026</p>
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
                            Welcome to Social Sched! These Terms of Service ("Terms") govern your use of our website and services. By using our services, you agree to these Terms.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Use of Our Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                        <p>You must be at least 13 years old to use our services. You are responsible for your account and its security. You may not use our services for any illegal or unauthorized purpose.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Content
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                        <p>You are responsible for the content you post on Social Sched. We do not claim ownership of your content, but you grant us a license to use it to provide our services.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Changes to These Terms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                        <p>
                            We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date.
                        </p>
                        <p>
                            We encourage you to review these Terms periodically for any changes.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Us</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                        <p>If you have any questions about these Terms, please contact us:</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Email: support@socialsched.vibeship.in</li>
                            <li>Through our website: socialsched.vibeship.in</li>
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
