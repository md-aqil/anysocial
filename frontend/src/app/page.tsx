'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';
import { motion } from 'framer-motion';
import { ArrowUpRight, Play, Sparkles, Zap, Heart, ShoppingBag, User } from 'lucide-react';

const SOCIAL_PLATFORMS = [
  { Icon: InstagramLogo, name: 'Instagram' },
  { Icon: TiktokLogo, name: 'TikTok' },
  { Icon: YoutubeLogo, name: 'YouTube' },
  { Icon: LinkedinLogo, name: 'LinkedIn' },
  { Icon: TwitterLogo, name: 'X / Twitter' },
  { Icon: FacebookLogo, name: 'Facebook' },
  { Icon: ThreadsLogo, name: 'Threads' },
  { Icon: PinterestLogo, name: 'Pinterest' },
  { Icon: SnapchatLogo, name: 'Snapchat' }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F6F5EF] text-stone-900 font-sans selection:bg-[#CCFF00] selection:text-black overflow-x-hidden relative">
      
      {/* Background Subtle Grid Lines Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.07] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
          backgroundSize: '90px 90px'
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🚀 SCREEN 1: HERO SECTION (KENTYLE EDITORIAL HIGH FASHION STYLE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-6 pb-20 px-4 sm:px-8 container mx-auto max-w-7xl">
        
        {/* Navigation Header */}
        <header className="flex items-center justify-between border-b border-stone-300/60 pb-5 mb-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black uppercase tracking-tighter text-stone-900 font-mono">
              SOCIALSCHED
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-stone-600">
            <Link href="#about" className="hover:text-stone-900 transition-colors">Why SocialSched</Link>
            <Link href="#speed-scale" className="hover:text-stone-900 transition-colors">Platform</Link>
            <Link href="#why-us" className="hover:text-stone-900 transition-colors">Features</Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-stone-600 mr-2">
              <Heart className="w-4 h-4 cursor-pointer hover:text-stone-900 transition-colors" />
              <ShoppingBag className="w-4 h-4 cursor-pointer hover:text-stone-900 transition-colors" />
              <User className="w-4 h-4 cursor-pointer hover:text-stone-900 transition-colors" />
            </div>
            <Link href="/signup">
              <Button className="rounded-full bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black px-6 py-2.5 text-xs uppercase tracking-wider shadow-sm border border-black/10 transition-transform hover:scale-105 active:scale-95">
                Start Free ↗
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mb-12">
          
          {/* Left Subtext */}
          <div className="md:col-span-3 pt-2">
            <p className="text-xs font-semibold text-stone-500 max-w-[180px] leading-relaxed">
              Shatter the Mold, Own the Endless AI Social Style.
            </p>
          </div>

          {/* Center Main Title */}
          <div className="md:col-span-6 text-center">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-stone-900 leading-none">
              AUTOMATED<br />CONTENT
            </h1>
          </div>

          {/* Right Product Preview Card */}
          <div className="md:col-span-3 flex justify-end">
            <div className="bg-[#121214] text-white p-4 rounded-[1.8rem] w-full max-w-[220px] shadow-xl border border-stone-800 flex flex-col justify-between min-h-[220px]">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-800 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/p2.jpg" alt="AI Generated Fashion" className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] font-semibold text-stone-300 leading-tight mb-3">
                Shopify AI Studio Built For Brands
              </p>
              <Link href="/signup">
                <Button size="sm" className="w-full rounded-full bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-[10px] uppercase tracking-wider py-1.5 shadow-xs">
                  Start Free ↗
                </Button>
              </Link>
            </div>
          </div>

        </div>

        {/* Label Tag Bar above Giant Display Text */}
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-stone-500 mb-2 border-t border-stone-300/60 pt-3">
          <span>TREND</span>
          <span>COLLECTION</span>
          <span>INSPIRE</span>
          <span className="hidden sm:inline">DESIGN</span>
          <span className="hidden md:inline">(UNLIMITED)</span>
          <span>(AI CREATIVE)</span>
        </div>

        {/* Giant Display Text + Overlapping Center Floating Card */}
        <div className="relative flex flex-col items-center justify-center py-6 my-4 select-none">
          
          {/* Massive Display Text */}
          <h2 className="text-[14vw] font-black uppercase tracking-tighter leading-none text-stone-900 text-center w-full whitespace-nowrap">
            SOCIAL SCHED
          </h2>

          {/* Floating Center Portrait Card Overlapping Text */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 md:w-96 rounded-[2.2rem] bg-white p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.18)] border-4 border-white z-20 group"
          >
            <div className="relative aspect-[4/5] rounded-[1.8rem] overflow-hidden bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/p1.jpg" 
                alt="Editorial AI Model" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />

              {/* Vertical Volt Green Left Badge */}
              <div className="absolute top-4 left-3 [writing-mode:vertical-lr] rotate-180 bg-[#CCFF00] text-black font-black text-[9px] uppercase tracking-widest px-2 py-3 rounded-full shadow-md">
                CURRENT AI IN 2025
              </div>

              {/* Floating Bottom Pill Badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md text-stone-900 text-xs font-extrabold px-4 py-3 rounded-2xl text-center shadow-lg border border-stone-200/80">
                Experience AI Content That Knows No Boundaries
              </div>
            </div>
          </motion.div>

        </div>

        {/* Minimalist Social Platform Marquee Below Hero */}
        <div className="mt-20 pt-8 border-t border-stone-300/60 overflow-hidden">
          <div className="flex w-[200%] animate-marquee">
            {[...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS].map((p, idx) => (
              <div key={idx} className="flex items-center gap-2.5 mx-10 shrink-0 text-stone-500 hover:text-stone-900 transition-colors">
                <p.Icon className="w-5 h-5 text-stone-700" />
                <span className="text-xs font-black uppercase tracking-widest">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 💡 SCREEN 2: WHY SOCIALSCHED (KENTYLE EDITORIAL BENTO SECTION) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="about" className="py-20 px-4 sm:px-8 container mx-auto max-w-7xl relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-xs font-black uppercase tracking-widest bg-[#CCFF00] text-black px-4 py-1.5 rounded-full mb-4 shadow-2xs">
            WHY SOCIALSCHED
          </span>
          <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-stone-900 leading-none">
            STOP JUGGLING 5 DIFFERENT TOOLS FOR ONE POST
          </h2>
          <p className="text-stone-600 text-sm sm:text-base max-w-xl mx-auto mt-4 font-medium leading-relaxed">
            No need to prompt ChatGPT for copy, generate images on Midjourney, and log into 5 social apps manually. SocialSched does it all in one click.
          </p>
        </div>

        {/* Bento Grid Layout in Kentyle Style */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Bento Card 1: Blue Editorial Photo Card */}
          <div className="md:col-span-4 bg-[#0284C7] text-white rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden min-h-[380px] shadow-xl group">
            <div className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/p4.jpg" alt="AI Brand Feature" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0284C7] via-[#0284C7]/50 to-transparent" />

            <div className="relative z-10 flex justify-between items-start">
              <span className="text-xl font-black tracking-widest uppercase font-mono">SOCIALSCHED</span>
              <span className="w-9 h-9 rounded-full bg-[#CCFF00] text-black flex items-center justify-center font-bold">
                <Zap className="w-4 h-4 fill-black" />
              </span>
            </div>

            <div className="relative z-10 mt-auto bg-white text-stone-900 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-2xl font-black uppercase tracking-tight text-stone-900 mb-2">One URL. Zero Hassle.</h3>
              <p className="text-xs font-semibold text-stone-600 leading-relaxed">
                Skip manual image generation and prompt engineering. Just paste your product URL and get on-brand ad creatives, tailored copy, and instant multi-platform scheduling.
              </p>
            </div>
          </div>

          {/* Bento Card 2: Light Gray Testimonial Card */}
          <div className="md:col-span-4 bg-white border border-stone-300/80 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[380px] shadow-sm">
            <div>
              <span className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-2">EFFICIENCY METRIC</span>
              <h3 className="text-6xl font-black text-stone-900 tracking-tighter">100%</h3>
            </div>

            <div className="space-y-4 pt-6">
              <div className="flex -space-x-2">
                {['/p1.jpg', '/p2.jpg', '/p4.jpg'].map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <p className="text-xs font-semibold text-stone-700 leading-relaxed italic">
                "Instead of writing captions on ChatGPT and posting to Instagram, TikTok, and LinkedIn individually, SocialSched creates and schedules everything in seconds."
              </p>
            </div>
          </div>

          {/* Bento Card 3 & 4 Right Column Stack */}
          <div className="md:col-span-4 flex flex-col gap-6">
            
            {/* Bento Card 3: Volt Green Highlight Card */}
            <div className="bg-[#CCFF00] text-stone-900 rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between min-h-[220px] shadow-md">
              <div>
                <span className="text-xs font-black text-stone-800 uppercase tracking-widest block mb-1">ALL-IN-ONE ENGINE</span>
                <h3 className="text-3xl font-black uppercase tracking-tight text-stone-900">Replace 5 Tools</h3>
              </div>
              <p className="text-xs font-extrabold text-stone-800 leading-snug">
                Combines AI image creation, style matching, copy writing, and multi-network publishing into one single workflow.
              </p>
            </div>

            {/* Bento Card 4: Dark Obsidian Card */}
            <div className="bg-[#121214] text-white rounded-[2.5rem] p-8 flex items-center justify-between shadow-xl border border-stone-800">
              <span className="text-xs font-black text-stone-400 uppercase tracking-widest">From URL to Published</span>
              <span className="text-2xl font-black text-[#CCFF00] uppercase tracking-wider">One Click</span>
            </div>

          </div>

        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🎬 SCREEN 3: DARK THEME VIDEO SECTION (EXACT BLACK CARD DESIGN FROM REFERENCE IMAGE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="speed-scale" className="py-16 px-4 sm:px-8 container mx-auto max-w-7xl relative z-10">
        
        {/* Exact Dark Card Container from Reference Image */}
        <div className="bg-[#0F0F10] rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-12 md:p-14 text-white relative shadow-2xl overflow-hidden border border-stone-800">
          
          {/* Subtle Grid Line Texture Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              backgroundImage: `linear-gradient(to right, #FFF 1px, transparent 1px), linear-gradient(to bottom, #FFF 1px, transparent 1px)`,
              backgroundSize: '80px 80px'
            }}
          />

          {/* Top Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-12 relative z-10">
            
            {/* Top Left Headline: WE PROVIDE FRESH INNOVATIVE_OPTIONS FOR YOU */}
            <div className="md:col-span-8">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-mono">
                WE PROVIDE AUTOMATED<br />
                AI_CONTENT<br />
                FOR YOU
              </h2>
            </div>

            {/* Top Right Subtext & Action */}
            <div className="md:col-span-4 flex flex-col justify-between items-start md:items-end">
              <p className="text-xs text-stone-400 max-w-xs leading-relaxed mb-4 md:text-right font-medium">
                Discover a wide range of innovative AI directions, thoughtfully designed to meet your brand needs and exceed expectations.
              </p>
              <Link href="/signup">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white hover:text-[#CCFF00] transition-colors cursor-pointer border-b border-white/40 pb-0.5">
                  LEARN MORE ↗
                </span>
              </Link>
            </div>

          </div>

          {/* Center Area: Scrolling Channel Names Marquee + Center Video Frame */}
          <div className="relative my-8 py-8 flex flex-col items-center justify-center min-h-[400px]">
            
            {/* Scrolling Social Media Channel Names Marquee in Background */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 overflow-hidden pointer-events-none opacity-20 select-none">
              <div className="flex w-[200%] animate-marquee">
                {[...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS].map((p, idx) => (
                  <span key={idx} className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter mx-8 text-stone-400 whitespace-nowrap">
                    WHAT CREATORS ARE MOST LOVING • {p.name} •
                  </span>
                ))}
              </div>
            </div>

            {/* Center Video Frame with Reference Image Behind Accent */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-20 w-full max-w-xl aspect-video rounded-[2.2rem] bg-stone-900 border-2 border-white/20 p-2 overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.8)] group"
            >
              <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative bg-black flex items-center justify-center">
                <video
                  src="/hero.mp4"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Floating Volt Green Action Button */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
                  <Link href="/signup">
                    <Button className="rounded-full bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-xs uppercase tracking-wider py-2.5 px-6 shadow-xl flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
                      Start Free <span className="w-5 h-5 rounded-full bg-black text-[#CCFF00] flex items-center justify-center font-bold text-[10px]">↗</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end pt-8 border-t border-stone-800/80 relative z-10">
            
            {/* Bottom Left: RECENTLY RELEASED THIS 2025 */}
            <div className="md:col-span-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-stone-400 block mb-4">
                RECENTLY RELEASED THIS 2025
              </span>

              {/* Bottom Left Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {['Shopify Sync', '5 AI Directions', 'Style Match', 'Auto Schedule'].map((tag, i) => (
                  <span key={i} className="text-[10px] font-bold text-stone-300 bg-stone-900 border border-stone-700/80 px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Right Headline: LOVE WHAT WE DELIVER */}
            <div className="md:col-span-8 md:text-right">
              <h3 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-none">
                LOVE WHAT<br />
                WE DELIVER
              </h3>
            </div>

          </div>

        </div>

      </section>

      {/* 🔚 FOOTER */}
      <footer className="border-t border-stone-300/60 bg-[#F6F5EF] py-12 text-center relative z-10">
        <div className="container mx-auto px-6 flex flex-col items-center gap-4">
          <span className="text-2xl font-black uppercase tracking-tighter text-stone-900 font-mono">
            SOCIALSCHED
          </span>
          <p className="text-stone-500 text-xs font-semibold">
            &copy; {new Date().getFullYear()} SocialSched. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}