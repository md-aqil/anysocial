'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';
import { motion } from 'framer-motion';
import { ArrowUpRight, Play, Sparkles, Star, Zap } from 'lucide-react';

// Swiper React components & styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const CAROUSEL_IMAGES = [
  { id: 1, src: '/p1.jpg', tag: 'Product Ad', subtitle: 'AI Generated', price: '$2,670' },
  { id: 2, src: '/p2.jpg', tag: 'Style Match', subtitle: 'On-Brand', price: '$1,200' },
  { id: 3, src: '/p4.jpg', tag: 'Visual Concept', subtitle: '520k+ Reach', price: 'High Impact' },
  { id: 4, src: '/p5.jpg', tag: 'Campaign Reel', subtitle: 'Scheduled', price: '10× Faster' },
  { id: 5, src: '/p6.jpg', tag: 'Shopify Sync', subtitle: 'Catalog Feed', price: 'Automated' },
  { id: 6, src: '/p7.jpg', tag: 'Social Creative', subtitle: 'AI Series', price: 'One-Click' },
  { id: 7, src: '/p1.jpg', tag: 'Brand Studio', subtitle: 'Multi-Channel', price: '$3,400' },
  { id: 8, src: '/p2.jpg', tag: 'Style Transfer', subtitle: 'Reference Match', price: 'Instant' },
  { id: 9, src: '/p4.jpg', tag: 'AI Director', subtitle: 'Engagement', price: 'High Impact' },
  { id: 10, src: '/p5.jpg', tag: 'Auto Publisher', subtitle: 'Scheduled', price: '520k+' },
  { id: 11, src: '/p6.jpg', tag: 'Visual Brand', subtitle: 'Shopify Sync', price: 'Active' },
  { id: 12, src: '/p7.jpg', tag: 'Content Flow', subtitle: 'AI Automation', price: 'Unlimited' },
];

const REELS = [
  { id: 1, video: '/reel_d5ba96a2-cfa4-432a-8858-0b260d165e3f_1779902560345.mp4' },
  { id: 2, video: '/reel_4355339a-11e4-4a86-ac83-dacacc1094f5_1783164248084.mp4' },
  { id: 3, video: '/reel_7e469a9b-affc-46df-bc17-eda51f5a5a16_1779904464075.mp4' },
  { id: 4, video: '/reel-7-july.mp4' },
  { id: 5, video: '/926b3a94-17c3-45d0-b87a-766b7ee20a21-2.mp4' },
  { id: 6, video: '/reel-6-july.mp4' },
];

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
  const [reels] = useState<any[]>(REELS);

  return (
    <div className="min-h-screen bg-white text-stone-900 font-sans selection:bg-[#0284C7]/20 overflow-x-hidden">
      
      {/* 🚀 SKY & CLOUD HERO SECTION WITH REALISTIC BACKGROUND */}
      <section className="relative bg-gradient-to-b from-[#0284C7] via-[#0082CD] to-[#0284C7] text-white pt-6 pb-28 px-4 rounded-b-[3.5rem] shadow-2xl overflow-hidden min-h-[800px] flex flex-col justify-between">
        
        {/* Photorealistic Clouds Background Texture Layer along the bottom */}
        <div 
          className="absolute inset-0 bg-cover bg-bottom opacity-75 pointer-events-none mix-blend-screen"
          style={{ backgroundImage: `url('/sky_cloud_hero_bg.jpg')` }}
        />

        {/* Ambient Sky Glow Accent */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[100%] h-[400px] bg-sky-200/20 blur-[130px] rounded-full pointer-events-none" />

        {/* Navigation Header */}
        <header className="container mx-auto max-w-7xl px-4 h-20 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SocialSched Logo" className="h-12 w-auto object-contain brightness-0 invert" />
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-sky-100/90">
            <Link href="#" className="hover:text-white transition-colors">Home</Link>
            <Link href="#speed-scale" className="hover:text-white transition-colors">Platform</Link>
            <Link href="#about" className="hover:text-white transition-colors">Why SocialSched</Link>
            <Link href="#demo" className="hover:text-white transition-colors">Demo</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-sky-100 hover:text-white transition-colors hidden sm:inline-block">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="rounded-full bg-[#D9F99D] hover:bg-[#bef264] text-black font-extrabold px-6 py-2.5 shadow-[0_4px_20px_rgba(217,249,157,0.3)] transition-transform hover:scale-105 active:scale-95 text-xs uppercase tracking-wider">
                Start Free ↗
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Copy */}
        <div className="container mx-auto max-w-4xl text-center pt-8 pb-4 relative z-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.12] mb-6 text-white"
          >
            AI That Creates, Writes <br className="hidden sm:block" /> & Schedules Your Content
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-xl text-sky-100/90 max-w-2xl mx-auto mb-8 leading-relaxed font-normal"
          >
            Stop designing every post from scratch. SocialSched transforms your product into beautiful, on-brand creatives, writes engaging captions, and schedules your content calendar automatically.
          </motion.p>

          {/* Enhanced Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-5 mb-8"
          >
            <a href="#speed-scale">
              <Button size="lg" className="rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/30 text-white font-extrabold px-8 h-14 text-xs tracking-widest uppercase shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                </div>
                Watch AI in Action
              </Button>
            </a>
            <Link href="/signup">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-[#D9F99D] via-[#CCFF00] to-[#D9F99D] hover:bg-[#bef264] text-black font-black px-9 h-14 text-xs tracking-widest uppercase shadow-[0_10px_35px_rgba(217,249,157,0.4)] border border-[#CCFF00] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group">
                Start Free
                <span className="w-7 h-7 rounded-full bg-black text-[#D9F99D] flex items-center justify-center font-bold shadow-sm group-hover:rotate-45 transition-transform duration-300">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </Button>
            </Link>
          </motion.div>

          {/* Replaced Badge: TRUSTED WORLDWIDE Pill with Integrated Redesigned Social Icons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-3 text-xs font-bold text-sky-100/90 bg-white/15 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/25 shadow-lg"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-white/20">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9F99D] animate-pulse" />
              <span className="uppercase tracking-widest text-[11px] font-black text-white">TRUSTED WORLDWIDE</span>
            </div>
            
            <div className="flex items-center gap-3 text-white opacity-95">
              <InstagramLogo className="w-4 h-4 hover:scale-125 transition-transform cursor-pointer" />
              <TiktokLogo className="w-4 h-4 hover:scale-125 transition-transform cursor-pointer" />
              <YoutubeLogo className="w-4 h-4 hover:scale-125 transition-transform cursor-pointer" />
              <LinkedinLogo className="w-4 h-4 hover:scale-125 transition-transform cursor-pointer" />
              <TwitterLogo className="w-4 h-4 hover:scale-125 transition-transform cursor-pointer" />
              <FacebookLogo className="w-4 h-4 hover:scale-125 transition-transform cursor-pointer" />
            </div>
          </motion.div>
        </div>

        {/* 🎡 FULL-WIDTH EDGE-TO-EDGE 3D COVERFLOW ARC CAROUSEL */}
        <div className="w-full max-w-full px-0 pt-2 pb-2 relative z-20 overflow-hidden">
          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slideToClickedSlide={true}
            slidesPerView={'auto'}
            initialSlide={3}
            speed={1000}
            autoplay={{
              delay: 2000,
              disableOnInteraction: false,
            }}
            loop={true}
            loopAdditionalSlides={8}
            coverflowEffect={{
              rotate: 20,
              stretch: -10,
              depth: 180,
              modifier: 1,
              slideShadows: false,
            }}
            keyboard={{
              enabled: true,
              onlyInViewport: true,
            }}
            modules={[EffectCoverflow, Keyboard, Autoplay, Navigation, Pagination]}
            className="mySwiper w-full py-8 !overflow-visible"
          >
            {CAROUSEL_IMAGES.map((card) => (
              <SwiperSlide key={card.id} className="!w-60 sm:!w-72 md:!w-[280px] select-none py-3">
                <div className="bg-white p-2.5 rounded-[2rem] shadow-[0_20px_45px_rgba(0,0,0,0.25)] border border-white/80 group hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden mx-auto">
                  <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-stone-100 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.src} alt={card.tag} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    {card.tag && (
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                        {card.tag}
                      </div>
                    )}
                    {card.price && (
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-stone-900 shadow-md">
                        {card.price}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-500">{card.subtitle}</span>
                    <span className="text-xs font-black text-stone-900">SocialSched</span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* 🎬 CINEMATIC FULL-WIDTH VIDEO SHOWCASE & COMPACT TRUST MARQUEE */}
      <section id="speed-scale" className="py-16 px-4 container mx-auto max-w-7xl relative z-20">
        
        {/* Compact Glassmorphic Infinite Marquee Bar */}
        <div className="max-w-4xl mx-auto rounded-full bg-white/90 backdrop-blur-md border border-stone-200/90 shadow-2xs py-2 px-6 flex items-center justify-between gap-4 overflow-hidden mb-12">
          <div className="flex items-center gap-2 shrink-0 border-r border-stone-200/80 pr-4">
            <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0284C7]">
              TRUSTED WORLDWIDE
            </span>
          </div>

          <div className="overflow-hidden w-full relative">
            <div className="flex w-[200%] animate-marquee">
              {[...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS].map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 mx-6 shrink-0 text-stone-600 hover:text-stone-900 transition-colors">
                  <p.Icon className="w-4 h-4 text-[#0284C7]" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Animated Headline: Everything You Need to Scale Social Media */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-stone-900 tracking-tight leading-[1.08] mb-6"
          >
            Everything You Need to <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0284C7] via-sky-500 to-[#0284C7]">Scale Social Media</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-stone-600 text-base sm:text-xl max-w-2xl mx-auto font-medium leading-relaxed mb-6"
          >
            Designed for <span className="inline-block px-4 py-1 bg-[#D9F99D] text-black font-extrabold rounded-full text-sm sm:text-base align-middle shadow-xs">⚡ Speed</span> & <span className="inline-block px-4 py-1 bg-sky-100 text-[#0284C7] font-extrabold rounded-full text-sm sm:text-base align-middle border border-sky-200/60">📈 Scale</span>.
          </motion.p>
        </div>

        {/* Full-Width Cinematic Video Player (/hero.mp4) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="w-full relative rounded-[2.5rem] sm:rounded-[3.5rem] p-3 bg-stone-900 border border-stone-800 shadow-[0_30px_90px_rgba(0,0,0,0.25)] overflow-hidden group"
        >
          <div className="w-full aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden relative bg-black flex items-center justify-center">
            <video
              src="/hero.mp4"
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Floating Top Status Badge */}
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-xs font-bold text-white uppercase tracking-wider pointer-events-none flex items-center gap-2 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9F99D] animate-pulse" />
              AI Showcase Demo Video
            </div>

            {/* Floating Bottom Action Bar */}
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4 pointer-events-auto">
              <Link href="/signup" className="flex-1 max-w-[220px]">
                <Button className="w-full rounded-full bg-[#D9F99D] hover:bg-[#bef264] text-black font-black text-xs uppercase tracking-wider py-3.5 px-6 shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95">
                  Start Free ↗
                </Button>
              </Link>
              <a href="#about" className="flex-1 max-w-[220px]">
                <Button className="w-full rounded-full bg-black/70 hover:bg-black backdrop-blur-md border border-white/30 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 px-6 shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95">
                  Explore Platform ↓
                </Button>
              </a>
            </div>
          </div>
        </motion.div>

      </section>

      {/* 💡 WHY SOCIALSCHED - BENTO GRID SECTION (EXPLAINING WHY THEY SHOULD USE SOCIALSCHED) */}
      <section id="about" className="py-20 bg-stone-50/50 border-t border-stone-200">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0284C7] mb-3 block">
              • WHY SOCIALSCHED
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight">
              Stop juggling <span className="inline-block px-3 py-1 bg-sky-100 text-[#0284C7] rounded-full text-2xl sm:text-4xl align-middle">5 different tools</span> for one post
            </h2>
            <p className="text-stone-600 text-base max-w-xl mx-auto mt-4 font-normal">
              No need to prompt ChatGPT for copy, generate images on Midjourney, and log into 5 social apps manually. SocialSched does it all in one click.
            </p>
          </div>

          {/* Inspiration Bento Grid (Why SocialSched Value Proposition) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento Card 1: Blue Image Card (One URL. Zero Fragmentation.) */}
            <div className="md:col-span-4 bg-[#0284C7] text-white rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden min-h-[380px] shadow-lg group">
              <div className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/p1.jpg" alt="AI Brand Feature" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0284C7] via-[#0284C7]/60 to-transparent" />

              <div className="relative z-10 flex justify-between items-start">
                <span className="text-xl font-black tracking-widest uppercase">SOCIALSCHED</span>
                <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Zap className="w-4 h-4" />
                </span>
              </div>

              <div className="relative z-10 mt-auto bg-white text-stone-900 rounded-2xl p-6 shadow-xl">
                <h3 className="text-2xl font-black text-stone-900 mb-2">One URL. Zero Hassle.</h3>
                <p className="text-xs font-semibold text-stone-600 leading-relaxed">
                  Skip manual image generation and prompt engineering. Just paste your product URL and get on-brand ad creatives, tailored copy, and instant multi-platform scheduling.
                </p>
              </div>
            </div>

            {/* Bento Card 2: Light Gray Testimonial Card (100% Automated Workflow) */}
            <div className="md:col-span-4 bg-[#F4F4F5] border border-stone-200/80 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[380px]">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">Commitment to efficiency</span>
                <h3 className="text-5xl font-black text-stone-900 tracking-tight">100%</h3>
              </div>

              <div className="space-y-4 pt-6">
                <div className="flex -space-x-2">
                  {['/p1.jpg', '/p2.jpg', '/p4.jpg'].map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="User avatar" className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <p className="text-xs font-semibold text-stone-700 leading-relaxed italic">
                  "Instead of writing captions on ChatGPT and posting to Instagram, TikTok, and LinkedIn individually, SocialSched creates and schedules everything in seconds."
                </p>
              </div>
            </div>

            {/* Bento Card 3 & 4 Right Column Stack */}
            <div className="md:col-span-4 flex flex-col gap-6">
              
              {/* Bento Card 3: Lime Green Highlight Card */}
              <div className="bg-[#D9F99D] text-stone-900 rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between min-h-[220px] shadow-sm">
                <div>
                  <span className="text-xs font-extrabold text-stone-700 uppercase tracking-wider block mb-1">ALL-IN-ONE PLATFORM</span>
                  <h3 className="text-3xl font-black text-stone-900 tracking-tight">Replace 5 Tools</h3>
                </div>
                <p className="text-xs font-bold text-stone-700 leading-snug">
                  Combines AI image creation, style matching, copy writing, and multi-network publishing into one single workflow.
                </p>
              </div>

              {/* Bento Card 4: Dark Obsidian Card */}
              <div className="bg-[#18181B] text-white rounded-[2.5rem] p-8 flex items-center justify-between shadow-lg">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">From URL to Published</span>
                <span className="text-3xl font-black text-[#D9F99D]">One Click</span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 📢 MARQUEE REELS SHOWCASE */}
      <section className="py-16 bg-white overflow-hidden relative">
        <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="flex w-[200%] animate-marquee">
          {[...reels, ...reels, ...reels, ...reels].map((reel, idx) => (
            <div key={idx} className="w-48 md:w-60 shrink-0 px-2.5">
              <div className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-stone-200 shadow-md group cursor-pointer bg-stone-900">
                <video src={reel.video} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all" autoPlay muted loop playsInline />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/40">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D9F99D]" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Video Reel</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🔚 FOOTER */}
      <footer className="border-t border-[#E5E7EB] bg-white py-12 text-center">
        <div className="container mx-auto px-6 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SocialSched Logo" className="h-9 w-auto object-contain" />
          <p className="text-stone-500 text-xs font-semibold">
            &copy; {new Date().getFullYear()} SocialSched. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}