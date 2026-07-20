'use client';

import Link from 'next/link';
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

const SOCIAL_PLATFORMS = [
  { Icon: InstagramLogo, name: 'INSTAGRAM' },
  { Icon: TiktokLogo, name: 'TIKTOK' },
  { Icon: YoutubeLogo, name: 'YOUTUBE' },
  { Icon: LinkedinLogo, name: 'LINKEDIN' },
  { Icon: TwitterLogo, name: 'TWITTER' },
  { Icon: FacebookLogo, name: 'FACEBOOK' },
  { Icon: ThreadsLogo, name: 'THREADS' },
  { Icon: PinterestLogo, name: 'PINTEREST' },
  { Icon: SnapchatLogo, name: 'SNAPCHAT' }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-900 font-sans selection:bg-[#CCFF00] selection:text-black overflow-x-hidden">
      
      {/* 🚀 HIGH-IMPACT SKY & CLOUD HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#0284C7] via-[#0082CD] to-[#0284C7] text-white pt-6 pb-20 px-4 sm:px-8 rounded-b-[3.5rem] shadow-[0_25px_80px_rgba(2,132,199,0.35)] overflow-hidden min-h-[880px] flex flex-col justify-between z-10">
        
        {/* Photorealistic Clouds Background Texture Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-bottom opacity-75 pointer-events-none mix-blend-screen"
          style={{ backgroundImage: `url('/sky_cloud_hero_bg.jpg')` }}
        />

        {/* Ambient Radial Sky Glow Accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[450px] bg-sky-200/25 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-[350px] h-[350px] bg-[#CCFF00]/15 blur-[120px] rounded-full pointer-events-none" />

        {/* Giant Watermarked Background Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none z-10">
          <span className="font-bebas text-[18vw] font-black leading-none text-white/10 uppercase tracking-widest block drop-shadow-xs">
            SOCIALSCHED
          </span>
        </div>

        {/* Navigation Header */}
        <header className="container mx-auto max-w-7xl px-4 h-20 flex items-center justify-between relative z-20 border-b border-white/20 pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SocialSched Logo" className="h-12 w-auto object-contain brightness-0 invert" />
            <span className="font-bebas text-3xl font-black text-white tracking-widest hidden sm:inline-block">SOCIALSCHED</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 uppercase tracking-widest text-sky-100/90 font-bebas text-lg font-bold">
            <Link href="#" className="hover:text-white transition-colors">Home</Link>
            <Link href="#speed-scale" className="hover:text-white transition-colors">Platform</Link>
            <Link href="#about" className="hover:text-white transition-colors">Why SocialSched</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-sky-100 hover:text-white transition-colors hidden sm:inline-block">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="rounded-full bg-[#CCFF00] hover:bg-[#bef264] text-black font-extrabold px-6 py-2.5 shadow-[0_4px_20px_rgba(204,255,0,0.3)] transition-transform hover:scale-105 active:scale-95 text-xs uppercase tracking-wider">
                Start Free ↗
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Central Content */}
        <div className="container mx-auto max-w-5xl text-center pt-8 pb-4 relative z-20">
          
          {/* Top Pill Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white text-xs font-extrabold uppercase tracking-widest mb-6 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
            Shatter the Mold, Own the Social Feed
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-bebas text-5xl sm:text-7xl lg:text-[104px] font-black tracking-tight leading-[0.9] text-white uppercase mb-6 drop-shadow-sm"
          >
            AI That Creates, Writes <br className="hidden sm:block" /> & Schedules Your Content
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sky-100/95 text-base sm:text-xl font-medium leading-relaxed max-w-2xl mx-auto mb-8"
          >
            Stop designing every post from scratch. SocialSched transforms your product into beautiful, on-brand creatives, writes engaging captions, and schedules your content calendar automatically.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-5 mb-6"
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
              <Button size="lg" className="rounded-full bg-gradient-to-r from-[#CCFF00] via-[#D9F99D] to-[#CCFF00] hover:bg-[#bef264] text-black font-black px-9 h-14 text-xs tracking-widest uppercase shadow-[0_10px_35px_rgba(204,255,0,0.45)] border border-[#CCFF00] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group">
                Start Free
                <span className="w-7 h-7 rounded-full bg-black text-[#CCFF00] flex items-center justify-center font-bold shadow-sm group-hover:rotate-45 transition-transform duration-300">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </Button>
            </Link>
          </motion.div>

        </div>

        {/* 🎡 FULL SCREEN VIEWPORT EDGE-TO-EDGE 3D COVERFLOW INFINITE AUTO-SCROLL CAROUSEL */}
        <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw] pt-2 pb-2 z-20 overflow-hidden swiper-linear-motion">
          <style jsx global>{`
            .swiper-linear-motion .swiper-wrapper {
              transition-timing-function: linear !important;
            }
          `}</style>
          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slideToClickedSlide={true}
            slidesPerView={'auto'}
            initialSlide={0}
            speed={2500}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: false,
            }}
            loop={true}
            loopAdditionalSlides={12}
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
            {[...CAROUSEL_IMAGES, ...CAROUSEL_IMAGES].map((card, idx) => (
              <SwiperSlide key={`${card.id}-${idx}`} className="!w-60 sm:!w-72 md:!w-[280px] select-none py-3">
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
                    <span className="text-[11px] font-bold text-[#0284C7]">{card.subtitle}</span>
                    <span className="text-xs font-black text-stone-900">SocialSched</span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Bottom Social Media Platforms Marquee Ticker */}
        <div className="w-full overflow-hidden pt-4 border-t border-white/20 relative z-20">
          <div className="flex w-[200%] animate-marquee">
            {[...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS].map((p, idx) => (
              <div key={idx} className="flex items-center gap-2.5 mx-8 shrink-0 text-sky-100 hover:text-white transition-colors">
                <p.Icon className="w-4 h-4 text-[#CCFF00]" />
                <span className="font-bebas text-sm font-bold uppercase tracking-wider">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* 🎬 SECOND SCREEN: BLACK THEME VIDEO SECTION (RE-WRITTEN COPY FOR SOCIALSCHED APP) */}
      <section id="speed-scale" className="w-screen relative left-1/2 right-1/2 -mx-[50vw] bg-[#0B0B0C] text-white pt-24 pb-20 px-6 md:px-16 border-t border-b border-stone-800 shadow-2xl bg-grid-pattern-dark -mt-10 z-0">
        
        <div className="max-w-[1400px] mx-auto relative z-10">
          
          {/* Top Row: Left Headline + Right Subtitle & Action Button */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-12">
            
            {/* Top-Left Headline */}
            <div className="md:col-span-8">
              <h2 className="font-bebas text-4xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[0.93] text-white uppercase">
                WE PROVIDE 10X FASTER <br />
                <span className="text-[#CCFF00]">CONTENT_AUTOMATION</span> <br />
                FOR YOUR BRAND
              </h2>
            </div>

            {/* Top-Right Subtitle & Action Link */}
            <div className="md:col-span-4 text-left md:text-right flex flex-col justify-between h-full space-y-5 pt-2">
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed max-w-sm md:ml-auto font-medium">
                Transform raw Shopify products into 5 unique visual directions, AI-written captions, and automated multi-channel posts in seconds.
              </p>
              <div>
                <Link href="/signup">
                  <span className="font-bebas text-base sm:text-lg tracking-widest text-white hover:text-[#CCFF00] uppercase font-bold inline-flex items-center gap-1.5 transition-colors group cursor-pointer border-b border-white/20 pb-1">
                    EXPLORE PLATFORM ↗
                  </span>
                </Link>
              </div>
            </div>

          </div>

          {/* Center Video Container with Floating Action Pill */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-black aspect-video max-w-5xl mx-auto my-8 border border-stone-800 shadow-[0_30px_90px_rgba(0,0,0,0.8)] group z-20">
            <video
              src="/hero.mp4"
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Floating Center/Bottom Lime Pill Button */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
              <Link href="/signup">
                <Button className="rounded-full bg-[#CCFF00] hover:bg-[#bef264] text-black font-extrabold text-xs uppercase tracking-widest py-4 px-8 shadow-2xl flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95">
                  Start Free ↗
                </Button>
              </Link>
            </div>
          </div>

          {/* Marquee Social Channels Scrolling Text Animation Behind Video */}
          <div className="w-full overflow-hidden my-8 opacity-25 pointer-events-none relative z-10">
            <div className="flex w-[200%] animate-marquee">
              {[...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS, ...SOCIAL_PLATFORMS].map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 mx-8 shrink-0 text-white font-bebas text-4xl md:text-6xl tracking-widest uppercase">
                  <span>{p.name}</span>
                  <span className="text-[#CCFF00]">•</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row: Left Filter Pills + Right "SCALE WHAT YOU CREATE" Headline */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end pt-8 border-t border-stone-800/80 relative z-20">
            
            {/* Bottom-Left Filter Pills */}
            <div className="md:col-span-6 flex flex-wrap gap-2.5">
              <span className="bg-white text-black px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
                Shopify Direct Sync
              </span>
              <span className="bg-stone-900 border border-stone-700 text-stone-300 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                5 Creative Directions
              </span>
              <span className="bg-stone-900 border border-stone-700 text-stone-300 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                Style Reference Match
              </span>
              <span className="bg-stone-900 border border-stone-700 text-stone-300 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                Multi-Channel Publishing
              </span>
            </div>

            {/* Bottom-Right Typography */}
            <div className="md:col-span-6 text-left md:text-right">
              <h3 className="font-bebas text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.92] text-white uppercase">
                SCALE WHAT <br />
                <span className="text-[#CCFF00]">YOU CREATE</span>
              </h3>
            </div>

          </div>

        </div>

      </section>

      {/* 💡 WHY SOCIALSCHED - BENTO GRID SECTION (KENTYLE GRID AESTHETIC) */}
      <section id="about" className="py-24 bg-[#F2F3ED] bg-grid-pattern-light relative z-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0284C7] mb-3 block font-bebas text-sm">
              • WHY SOCIALSCHED
            </span>
            <h2 className="font-bebas text-4xl sm:text-6xl text-stone-900 tracking-tight leading-none uppercase">
              STOP JUGGLING <span className="inline-block px-4 py-1 bg-[#CCFF00] text-black rounded-full text-3xl sm:text-5xl align-middle font-black">5 DIFFERENT TOOLS</span> FOR ONE POST
            </h2>
            <p className="text-stone-600 text-base max-w-xl mx-auto mt-4 font-medium">
              No need to prompt ChatGPT for copy, generate images on Midjourney, and log into 5 social apps manually. SocialSched does it all in one click.
            </p>
          </div>

          {/* Inspiration Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento Card 1: Blue Image Card */}
            <div className="md:col-span-4 bg-[#0284C7] text-white rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden min-h-[380px] shadow-lg group">
              <div className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/p1.jpg" alt="AI Brand Feature" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0284C7] via-[#0284C7]/60 to-transparent" />

              <div className="relative z-10 flex justify-between items-start">
                <span className="font-bebas text-2xl font-black tracking-widest uppercase">SOCIALSCHED</span>
                <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Zap className="w-4 h-4" />
                </span>
              </div>

              <div className="relative z-10 mt-auto bg-white text-stone-900 rounded-2xl p-6 shadow-xl">
                <h3 className="font-bebas text-3xl font-black text-stone-900 mb-1 leading-none">ONE URL. ZERO HASSLE.</h3>
                <p className="text-xs font-semibold text-stone-600 leading-relaxed">
                  Skip manual image generation and prompt engineering. Just paste your product URL and get on-brand ad creatives, tailored copy, and instant multi-platform scheduling.
                </p>
              </div>
            </div>

            {/* Bento Card 2: Light Gray Testimonial Card */}
            <div className="md:col-span-4 bg-white border border-stone-300/80 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[380px] shadow-xs">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2 font-bebas text-sm">Commitment to efficiency</span>
                <h3 className="font-bebas text-6xl font-black text-stone-900 tracking-tight leading-none">100%</h3>
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
              <div className="bg-[#CCFF00] text-stone-900 rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between min-h-[220px] shadow-sm">
                <div>
                  <span className="text-xs font-extrabold text-stone-800 uppercase tracking-wider block mb-1 font-bebas text-sm">ALL-IN-ONE PLATFORM</span>
                  <h3 className="font-bebas text-4xl font-black text-stone-900 tracking-tight leading-none">REPLACE 5 TOOLS</h3>
                </div>
                <p className="text-xs font-bold text-stone-800 leading-snug">
                  Combines AI image creation, style matching, copy writing, and multi-network publishing into one single workflow.
                </p>
              </div>

              {/* Bento Card 4: Dark Obsidian Card */}
              <div className="bg-[#18181B] text-white rounded-[2.5rem] p-8 flex items-center justify-between shadow-lg">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider font-bebas text-base">From URL to Published</span>
                <span className="font-bebas text-4xl font-black text-[#CCFF00]">ONE CLICK</span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 🔚 FOOTER */}
      <footer className="border-t border-stone-300/80 bg-white py-12 text-center relative z-20">
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