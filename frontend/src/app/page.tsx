'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Link2, Calendar, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">SEO Genie</h1>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Manage Your Social Media
            <br />
            <span className="text-primary">All in One Place</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect your Instagram, LinkedIn, Twitter, TikTok, and YouTube accounts.
            Schedule posts, track performance, and grow your audience.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Start Free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Login
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Multi-Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect Instagram, LinkedIn, Twitter, TikTok, and YouTube
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Link2 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Secure OAuth</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Industry-standard authentication with encrypted token storage
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Schedule posts in advance with automatic publishing
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track post performance across all your platforms
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2024 SEO Genie. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}