'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';
import { motion } from 'framer-motion';
import { ArrowUpRight, Play, Zap, Wand2, Calendar, ShoppingBag, Camera, Users, Briefcase } from 'lucide-react';

// Swiper React components & styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const CAROUSEL_IMAGES = [
  { id: 1, src: '/p1.jpg', tag: 'Product Ad', subtitle: 'AI Generated', price: '$2,670' },
  { id: 'v1', src: '/reel-6-july.mp4', tag: 'Video Reel', subtitle: 'Cinematic', price: 'High Impact' },
  { id: 2, src: '/p2.jpg', tag: 'Style Match', subtitle: 'On-Brand', price: '$1,200' },
  { id: 3, src: '/p4.jpg', tag: 'Visual Concept', subtitle: '520k+ Reach', price: 'Trending' },
  { id: 'v2', src: '/926b3a94-17c3-45d0-b87a-766b7ee20a21-2.mp4', tag: 'Campaign Reel', subtitle: 'Automated', price: '10× Faster' },
  { id: 4, src: '/p5.jpg', tag: 'Social Feed', subtitle: 'Scheduled', price: 'Active' },
  { id: 5, src: '/p6.jpg', tag: 'Shopify Sync', subtitle: 'Catalog Feed', price: 'Automated' },
  { id: 'v3', src: '/reel-7-july.mp4', tag: 'AI Studio', subtitle: 'One-Click', price: 'High Impact' },
  { id: 6, src: '/p7.jpg', tag: 'Social Creative', subtitle: 'AI Series', price: 'One-Click' },
  { id: 7, src: '/p1.jpg', tag: 'Brand Studio', subtitle: 'Multi-Channel', price: '$3,400' },
  { id: 8, src: '/p2.jpg', tag: 'Style Transfer', subtitle: 'Reference Match', price: 'Instant' },
  { id: 9, src: '/p4.jpg', tag: 'AI Director', subtitle: 'Engagement', price: 'High Impact' },
];

const SOCIAL_PLATFORMS = [
  { Icon: InstagramLogo, name: 'INSTAGRAM' },
  { Icon: TiktokLogo, name: 'TIKTOK' },
  { Icon: YoutubeLogo, name: 'YOUTUBE' },
  { Icon: FacebookLogo, name: 'FACEBOOK' },
  { Icon: LinkedinLogo, name: 'LINKEDIN' },
  { Icon: PinterestLogo, name: 'PINTEREST' },
  { Icon: ThreadsLogo, name: 'THREADS' },
  { Icon: SnapchatLogo, name: 'SNAPCHAT' },
  { Icon: TwitterLogo, name: 'X' }
];

export default function HomePage() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const heroVideos = ['/hero.mp4', '/clander.mp4'];

  const handleVideoEnded = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % heroVideos.length);
  };

  return (
    <div className="min-h-screen bg-[#F2F3ED] text-stone-900 font-sans selection:bg-[#CCFF00] selection:text-black overflow-x-hidden">

      {/* 🚀 HIGH-IMPACT SKY & CLOUD HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#0284C7] via-[#0082CD] to-[#0284C7] text-white pt-6 pb-12 px-4 sm:px-8 rounded-b-[3.5rem] shadow-[0_25px_80px_rgba(2,132,199,0.35)] overflow-hidden min-h-[880px] flex flex-col justify-between z-20">

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
          <span className="font-bebas text-[22vw] font-black leading-none text-white/10 uppercase tracking-widest block drop-shadow-xs">
            NEWDONE
          </span>
        </div>

        {/* Navigation Header */}
        <header className="container mx-auto max-w-7xl px-4 h-20 flex items-center justify-between relative z-20 border-b border-white/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl text-[#CCFF00] shadow-sm">
              N
            </div>
            <span className="font-bebas text-3xl font-black text-white tracking-widest">NEWDONE</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 uppercase tracking-widest text-sky-100/90 font-bebas text-lg font-bold">
            <Link href="#" className="hover:text-white transition-colors">Home</Link>
            <Link href="#speed-scale" className="hover:text-white transition-colors">Platform</Link>
            <Link href="#about" className="hover:text-white transition-colors">Why Newdone</Link>
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
            FROM PRODUCT <br className="hidden sm:block" /> TO PUBLISHED CAMPAIGN.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sky-100/95 text-base sm:text-xl font-medium leading-relaxed max-w-2xl mx-auto mb-8"
          >
            Import any product. AI creates premium posts, captions, reels and schedules everything across every major platform—all from one intelligent workflow.
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

        {/* 🎡 3D COVERFLOW INFINITE AUTO-SCROLL CAROUSEL */}
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
            {[...CAROUSEL_IMAGES, ...CAROUSEL_IMAGES].map((card, idx) => {
              const platform = SOCIAL_PLATFORMS[idx % SOCIAL_PLATFORMS.length];
              return (
                <SwiperSlide key={`${card.id}-${idx}`} className="!w-60 sm:!w-72 md:!w-[280px] select-none py-3">
                  <div className="bg-white p-2.5 rounded-[2rem] shadow-[0_20px_45px_rgba(0,0,0,0.25)] border border-white/80 group hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden mx-auto">
                    <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-stone-100 mb-2">
                      {card.src.endsWith('.mp4') ? (
                        <video src={card.src} autoPlay loop muted playsInline className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={card.src} alt={card.tag} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}

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
                      <span className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1.5 tracking-wider">
                        <platform.Icon className="w-3.5 h-3.5 text-stone-700" />
                        POSTED ON {platform.name}
                      </span>
                      <span className="text-[11px] font-black text-[#0284C7]">Newdone</span>
                    </div>
                  </div>
                </SwiperSlide>
              )
            })}
          </Swiper>
        </div>

      </section>

      {/* 🎬 SECOND SCREEN: BLACK THEME VIDEO & STORYTELLING SECTION */}
      <section id="speed-scale" className="w-screen relative left-1/2 right-1/2 -mx-[50vw] bg-[#0B0B0C] text-white pt-24 pb-20 px-6 md:px-16 border-t border-b border-stone-800 shadow-2xl bg-grid-pattern-dark -mt-10 z-0">

        <div className="max-w-[1400px] mx-auto relative z-10">

          {/* --- MERGED "THE PROBLEM" CONTENT --- */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <span className="font-extrabold uppercase tracking-widest text-[#CCFF00] mb-3 block font-bebas text-sm">
              • THE PROBLEM
            </span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-bebas text-5xl sm:text-6xl text-white tracking-tight leading-none uppercase"
            >
              STOP SWITCHING BETWEEN <br className="hidden sm:block" />
              <span className="inline-block px-4 py-1 mt-2 bg-[#CCFF00] text-black rounded-full text-3xl sm:text-5xl align-middle font-black shadow-sm">
                5 DIFFERENT TOOLS
              </span>
            </motion.h2>
          </div>

          {/* Visual Story Flow - Compact Horizontal Layout (Dark Theme) */}
          <div className="flex flex-col md:flex-row items-center justify-center w-full gap-4 md:gap-6 relative mb-15">

            {/* The Old Way Tools Wrapped */}
            <div className="flex flex-wrap md:flex-nowrap justify-center items-center gap-3 md:gap-4 w-full md:w-auto relative z-10">
              {['ChatGPT', 'Midjourney', 'Canva', 'Buffer', 'Meta'].map((tool, index) => (
                <div key={tool} className="flex items-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[#18181B] border border-stone-800 px-5 py-3 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex justify-center items-center"
                  >
                    <span className="font-bebas font-bold text-xl text-stone-300 tracking-wider uppercase">{tool}</span>
                  </motion.div>

                  {/* Arrow pointing right */}
                  {index < 4 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: (index * 0.1) + 0.1 }}
                      className="hidden md:block w-6 border-t-2 border-dashed border-stone-600 mx-2 relative"
                    >
                      <div className="absolute right-[-6px] top-[-6px] text-stone-600 text-[10px]">▶</div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            {/* Down Arrow for Mobile / Right Arrow for Desktop into Newdone */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.5 }}
              className="md:hidden h-8 border-l-2 border-dashed border-[#CCFF00]/50 my-2 relative"
            >
              <div className="absolute bottom-[-6px] left-[-6px] text-[#CCFF00]/50 text-[10px]">▼</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.5 }}
              className="hidden md:block w-8 border-t-2 border-dashed border-[#CCFF00]/50 mx-2 relative"
            >
              <div className="absolute right-[-6px] top-[-6px] text-[#CCFF00]/50 text-[10px]">▶</div>
            </motion.div>

            {/* The Merge / Solution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="relative z-20 w-full md:w-auto mt-4 md:mt-0"
            >
              <div className="bg-[#0284C7] text-white border border-[#0284C7] px-8 py-5 rounded-[2rem] shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0284C7] via-[#0284C7]/60 to-transparent" />
                <h3 className="font-bebas text-4xl font-black tracking-widest uppercase leading-none relative z-10 flex items-center justify-between gap-3">
                  NEWDONE
                  <span className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Zap className="w-3 h-3" />
                  </span>
                </h3>
                <p className="text-sky-100 text-[10px] font-black mt-2 uppercase tracking-widest relative z-10">One Intelligent Dashboard</p>
              </div>
            </motion.div>

          </div>

          {/* Center Video Container */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-black aspect-video max-w-5xl mx-auto my-8 border border-stone-800 shadow-[0_30px_90px_rgba(0,0,0,0.8)] group z-20">
            <video
              src={heroVideos[currentVideoIndex]}
              controls
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              className="w-full h-full object-cover transition-opacity duration-300"
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

          {/* Marquee Social Channels */}
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

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end pt-8 border-t border-stone-800/80 relative z-20">

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

            <div className="md:col-span-6 text-left md:text-right">
              <h3 className="font-bebas text-7xl font-black tracking-tight leading-[0.92] text-white uppercase">
                ONE PRODUCT. <br />
                <span className="text-[#CCFF00]">ONE WORKFLOW.</span>
              </h3>
            </div>

          </div>

        </div>

      </section>

      {/* 🎯 THIRD SCREEN: AUDIENCE SECTION (BENTO GRID DESIGN) */}
      <section id="about" className="py-24 bg-[#F2F3ED] bg-grid-pattern-light relative z-20 border-b border-stone-300/80">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0284C7] mb-3 block font-bebas text-sm">
              • WHO IT&apos;S FOR
            </span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-bebas text-7xl text-stone-900 leading-[0.92] uppercase"
            >
              BUILT FOR <span className="inline-block px-4 py-1 bg-[#CCFF00] text-black rounded-full text-3xl sm:text-5xl align-middle font-black mt-2 md:mt-0">EVERY MODERN</span> MARKETING TEAM.
            </motion.h2>
          </div>

          {/* Inspiration Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Bento Card 1: E-commerce Brands */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="md:col-span-4 bg-[#0284C7] text-white rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden min-h-[380px] shadow-lg group hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/p7.jpg" alt="E-commerce Brands" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0284C7] via-[#0284C7]/60 to-transparent" />

              <div className="relative z-10 flex justify-between items-start">
                <span className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </span>
              </div>

              <div className="relative z-10 mt-auto bg-white text-stone-900 rounded-2xl p-6 shadow-xl">
                <h3 className="font-bebas text-3xl font-black text-stone-900 mb-2 leading-none uppercase">E-COMMERCE BRANDS</h3>
                <p className="text-xs font-semibold text-stone-600 leading-relaxed">
                  Turn your product catalog into a viral, multi-channel social presence instantly.
                </p>
              </div>
            </motion.div>

            {/* Bento Card 2: Content Creators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-4 bg-white border border-stone-300/80 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden min-h-[380px] shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-300 group"
            >
              <div className="absolute inset-0 opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none">
                <video src="/clander.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/50 to-white/90 pointer-events-none" />

              <div className="relative z-10">
                <span className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center text-[#0284C7] border border-stone-200/50 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <Camera className="w-6 h-6" />
                </span>
                <h3 className="font-bebas text-4xl font-black text-stone-900 tracking-tight leading-none uppercase drop-shadow-sm">CONTENT CREATORS</h3>
              </div>

              <div className="relative z-10 space-y-4 pt-6">
                <div className="flex -space-x-2">
                  {['/p1.jpg', '/p2.jpg', '/p4.jpg'].map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="User avatar" className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm" />
                  ))}
                </div>
                <p className="text-sm font-semibold text-stone-800 leading-relaxed bg-white/60 backdrop-blur-md p-3 rounded-xl border border-white/40 shadow-sm">
                  Automate your entire distribution pipeline and focus purely on creating.
                </p>
              </div>
            </motion.div>

            {/* Bento Card 3 & 4 Stack */}
            <div className="md:col-span-4 flex flex-col gap-6">

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-[#CCFF00] text-stone-900 rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between min-h-[200px] shadow-sm hover:-translate-y-1 transition-transform duration-300 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bebas text-4xl font-black text-stone-900 tracking-tight leading-none uppercase">MARKETING<br />TEAMS</h3>
                  </div>
                  <span className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center text-stone-900 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </span>
                </div>
                <p className="text-sm font-bold text-stone-800 leading-snug">
                  Unify campaigns across all platforms with a single intelligent workflow.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-[#18181B] text-white rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between min-h-[160px] shadow-lg hover:-translate-y-1 transition-transform duration-300 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bebas text-3xl font-black text-white uppercase">AGENCIES</h3>
                  <span className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#CCFF00] group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </span>
                </div>
                <p className="text-xs font-semibold text-stone-400">
                  Scale client deliverables 10x faster with AI-generated assets and scheduling.
                </p>
              </motion.div>

            </div>

          </div>
        </div>
      </section>

      {/* 🌤 CREATIVE WINNING FOOTER */}
      <footer className="relative bg-gradient-to-b from-[#0284C7] via-[#0082CD] to-[#0284C7] text-white pt-16 pb-12 px-6 rounded-t-[3.5rem] shadow-[0_-25px_80px_rgba(2,132,199,0.35)] overflow-hidden z-20">

        {/* Photorealistic Clouds Background Texture Layer */}
        <div
          className="absolute inset-0 bg-cover bg-top opacity-75 pointer-events-none mix-blend-screen"
          style={{ backgroundImage: `url('/sky_cloud_hero_bg.jpg')` }}
        />

        {/* Ambient Radial Glow Accents */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[350px] bg-sky-200/25 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-[#CCFF00]/20 blur-[100px] rounded-full pointer-events-none" />

        {/* Giant Watermarked Background Text */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full text-center pointer-events-none select-none z-0">
          <span className="font-bebas text-[22vw] font-black leading-none text-white/10 uppercase tracking-widest block drop-shadow-xs">
            NEWDONE
          </span>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">

          {/* Footer Grid Links */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/20">

            {/* Column 1: Brand Info */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-lg text-[#CCFF00] shadow-sm">
                  N
                </div>
                <span className="font-bebas text-3xl font-black text-white tracking-widest">NEWDONE</span>
              </div>
              <p className="text-sky-100 text-xs sm:text-sm font-semibold leading-relaxed max-w-sm">
                The all-in-one AI content engine for brands and creators. Import products, generate visual directions, write captions, and schedule everywhere automatically.
              </p>

              {/* Social Platform Icons */}
              <div className="pt-2 flex items-center gap-3 text-sky-100">
                <InstagramLogo className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                <TiktokLogo className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                <YoutubeLogo className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                <LinkedinLogo className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                <TwitterLogo className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                <FacebookLogo className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-bebas text-xl tracking-widest text-[#CCFF00] uppercase font-black">PLATFORM</h4>
              <ul className="space-y-2 text-xs font-bold text-sky-100">
                <li><Link href="#speed-scale" className="hover:text-white transition-colors">Shopify Direct Sync</Link></li>
                <li><Link href="#speed-scale" className="hover:text-white transition-colors">5 AI Directions</Link></li>
                <li><Link href="#speed-scale" className="hover:text-white transition-colors">Style Reference Match</Link></li>
                <li><Link href="#speed-scale" className="hover:text-white transition-colors">AI Caption Writer</Link></li>
                <li><Link href="#speed-scale" className="hover:text-white transition-colors">Auto Multi-Publisher</Link></li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-bebas text-xl tracking-widest text-[#CCFF00] uppercase font-black">RESOURCES</h4>
              <ul className="space-y-2 text-xs font-bold text-sky-100">
                <li><Link href="#about" className="hover:text-white transition-colors">Why Newdone</Link></li>
                <li><Link href="#speed-scale" className="hover:text-white transition-colors">Platform Showcase</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Client Portal</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
              </ul>
            </div>

            {/* Column 4: Legal & System Status */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="font-bebas text-xl tracking-widest text-[#CCFF00] uppercase font-black">SYSTEM STATUS</h4>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/25 text-xs font-extrabold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] animate-pulse" />
                All Systems Operational
              </div>
              <p className="text-sky-100 text-xs pt-2 font-medium leading-normal">
                High-performance AI inference pipelines operating at peak speed across global endpoints.
              </p>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Terms */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-sky-100 gap-4">
            <p>&copy; {new Date().getFullYear()} Newdone. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition-colors">Cookie Preferences</Link>
            </div>
          </div>

        </div>

      </footer>

    </div>
  );
}