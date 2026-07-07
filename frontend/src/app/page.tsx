'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

const REELS = [
  { id: 1, video: '/reel_d5ba96a2-cfa4-432a-8858-0b260d165e3f_1779902560345.mp4' },
  { id: 2, video: '/reel_4355339a-11e4-4a86-ac83-dacacc1094f5_1783164248084.mp4' },
  { id: 3, video: '/reel_7e469a9b-affc-46df-bc17-eda51f5a5a16_1779904464075.mp4' },
  { id: 4, video: '/reel-7-july.mp4' },
  { id: 5, video: '/926b3a94-17c3-45d0-b87a-766b7ee20a21-2.mp4' },
  { id: 6, video: '/reel-6-july.mp4' },
];

export default function HomePage() {
  const [reels] = useState<any[]>(REELS);
  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-[#D27D50]/30 overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#D27D50]/20 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#09090B]/60 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Anysocial Logo" className="h-14 w-auto object-contain brightness-0 invert" />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-stone-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="rounded-full bg-white text-black hover:bg-stone-200 px-6 font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-95">
                Start for free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-16 relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 pb-8 text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8 shadow-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#D27D50] animate-pulse" />
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-widest">
              New: Generate Video Reels with AI Agents
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-4 text-white"
          >
            Run your social media <br className="hidden md:block" />
            on <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D27D50] via-[#E9967A] to-[#FFB6C1]">autopilot with AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-stone-400 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Plan, generate, and schedule posts automatically to all major networks.
            Let AI agents write, edit, and create stunning visual content in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/signup">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-[#D27D50] to-[#E9967A] text-white hover:opacity-90 px-8 h-14 text-base font-bold shadow-[0_0_30px_rgba(210,125,80,0.3)] transition-all hover:scale-105 active:scale-95 group">
                Start 7-day trial for $0
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* Social Icons Section */}
        <section className="container mx-auto px-4 py-6">
          <p className="text-center text-xs font-semibold text-stone-500 uppercase tracking-widest mb-4">
            Connects seamlessly with
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {[
              { Icon: InstagramLogo, name: 'Instagram', color: 'hover:border-[#E1306C] hover:text-[#E1306C]' },
              { Icon: TiktokLogo, name: 'TikTok', color: 'hover:border-white hover:text-white' },
              { Icon: YoutubeLogo, name: 'YouTube', color: 'hover:border-[#FF0000] hover:text-[#FF0000]' },
              { Icon: LinkedinLogo, name: 'LinkedIn', color: 'hover:border-[#0077B5] hover:text-[#0077B5]' },
              { Icon: TwitterLogo, name: 'X / Twitter', color: 'hover:border-white hover:text-white' },
              { Icon: FacebookLogo, name: 'Facebook', color: 'hover:border-[#1877F2] hover:text-[#1877F2]' },
              { Icon: ThreadsLogo, name: 'Threads', color: 'hover:border-white hover:text-white' },
              { Icon: PinterestLogo, name: 'Pinterest', color: 'hover:border-[#E60023] hover:text-[#E60023]' },
              { Icon: SnapchatLogo, name: 'Snapchat', color: 'hover:border-[#FFFC00] hover:text-[#FFFC00]' }
            ].map((platform) => (
              <div
                key={platform.name}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center text-stone-400 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-white/10 cursor-default ${platform.color}`}
                title={platform.name}
              >
                <platform.Icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            ))}
          </div>
        </section>

        {/* Marquee Scrolling Reels */}
        <section className="mt-12 mb-8 overflow-hidden w-full relative">
          <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#09090B] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#09090B] to-transparent z-10 pointer-events-none" />

          <div className="flex w-[200%] animate-marquee">
            {[...reels, ...reels, ...reels, ...reels, ...reels].map((reel, idx) => (
              <div key={idx} className="w-48 md:w-64 shrink-0 px-2">
                <div className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer bg-stone-900">
                  <video src={reel.video} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all" autoPlay muted loop playsInline />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-[#D27D50] flex items-center justify-center border-2 border-[#09090B]">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs font-bold text-white shadow-sm">AI Generated</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Bento Grid Section */}
        <section className="container mx-auto px-4 py-24 max-w-6xl relative z-20">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white"
            >
              All the tools required for social<br className="hidden md:block" /> media growth in one place
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Reel Creator */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#110C16] border border-purple-500/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col relative overflow-hidden group hover:border-purple-500/40 transition-colors shadow-[0_8px_30px_rgba(168,85,247,0.05)] min-h-[480px]"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] -z-10 group-hover:bg-purple-600/30 transition-colors" />
               
               <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-widest w-fit mb-6 border border-purple-500/20">Video Creation</span>
               
               <h3 className="text-3xl font-bold text-white mb-4">AI Product Reels</h3>
               <p className="text-stone-400 text-base mb-8 max-w-sm">Turn simple product links into viral, high-retention vertical videos instantly with our smart AI director.</p>
               
               <div className="mt-auto relative w-full h-56 rounded-t-2xl bg-black/40 border border-white/10 border-b-0 overflow-hidden flex items-end justify-center pb-0">
                  <div className="w-[70%] h-[90%] bg-[#09090B] rounded-t-xl border border-white/10 flex flex-col relative shadow-2xl overflow-hidden group-hover:-translate-y-2 transition-transform duration-500">
                     <div className="w-full h-[60%] bg-white/5 flex flex-col items-center justify-center border-b border-white/10">
                        <Play className="w-8 h-8 text-white/30" />
                     </div>
                     <div className="p-4 space-y-3">
                        <div className="w-3/4 h-2 bg-purple-500/40 rounded-full" />
                        <div className="w-1/2 h-2 bg-white/10 rounded-full" />
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* Card 2: Scheduling */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#160E0B] border border-[#D27D50]/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col relative overflow-hidden group hover:border-[#D27D50]/40 transition-colors shadow-[0_8px_30px_rgba(210,125,80,0.05)] min-h-[480px]"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#D27D50]/20 rounded-full blur-[80px] -z-10 group-hover:bg-[#D27D50]/30 transition-colors" />
               
               <span className="inline-block px-4 py-1.5 rounded-full bg-[#D27D50]/20 text-[#D27D50] text-[10px] font-bold uppercase tracking-widest w-fit mb-6 border border-[#D27D50]/20">Planning</span>
               
               <h3 className="text-3xl font-bold text-white mb-4">Seamless scheduling</h3>
               <p className="text-stone-400 text-base mb-8 max-w-sm">Schedule, analyze, and engage with your audience. Cross-post into multiple channels simultaneously.</p>
               
               <div className="mt-auto relative w-full h-56 rounded-t-2xl bg-black/40 border border-white/10 border-b-0 overflow-hidden p-6 grid grid-cols-4 gap-3 group-hover:-translate-y-2 transition-transform duration-500">
                  {Array.from({length: 12}).map((_, i) => (
                     <div key={i} className="bg-white/5 rounded-lg h-full flex items-end p-2 border border-white/5 relative">
                        {i % 4 === 1 && (
                          <div className="absolute bottom-2 left-2 right-2 h-6 bg-gradient-to-r from-[#D27D50] to-[#E8A583] rounded text-[8px] text-white font-bold flex items-center justify-center px-1 shadow-lg">Post</div>
                        )}
                        {i === 6 && (
                          <div className="absolute bottom-2 left-2 right-2 h-6 bg-purple-500/80 rounded text-[8px] text-white font-bold flex items-center justify-center px-1 shadow-lg">Reel</div>
                        )}
                     </div>
                  ))}
               </div>
            </motion.div>

            {/* Card 3: Series Creator */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 bg-[#0C1217] border border-blue-500/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group hover:border-blue-500/40 transition-colors shadow-[0_8px_30px_rgba(59,130,246,0.05)]"
            >
               <div className="absolute bottom-0 left-0 w-[80%] h-64 bg-blue-600/10 rounded-full blur-[100px] -z-10 group-hover:bg-blue-600/20 transition-colors" />
               
               <div className="flex-1 order-2 md:order-1 w-full">
                 <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest w-fit mb-6 border border-blue-500/20">Storytelling</span>
                 <h3 className="text-3xl font-bold text-white mb-4">AI Series Creator</h3>
                 <p className="text-stone-400 text-base max-w-md">Generate engaging, episodic content. Build a loyal audience over time with interconnected stories and consistent characters, completely automated by AI.</p>
               </div>
               
               <div className="flex-1 w-full order-1 md:order-2 aspect-[16/10] max-w-md bg-black/40 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex relative group-hover:scale-[1.02] transition-transform duration-500">
                  <div className="w-1/3 border-r border-white/10 bg-white/5 p-4 space-y-3">
                     <div className="w-full h-10 bg-white/10 rounded-lg" />
                     <div className="w-full h-10 bg-blue-500/20 border border-blue-500/30 rounded-lg relative overflow-hidden">
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                     </div>
                     <div className="w-full h-10 bg-white/10 rounded-lg" />
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-between">
                     <div className="space-y-3">
                       <div className="w-3/4 h-3 bg-white/20 rounded-full" />
                       <div className="w-1/2 h-3 bg-white/10 rounded-full" />
                       <div className="w-2/3 h-3 bg-white/10 rounded-full" />
                     </div>
                     <div className="w-full h-1/2 bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl border border-blue-500/20 flex items-center justify-center mt-6">
                        <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* Card 4: AI Content Assistant */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-[#0A1110] border border-emerald-500/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col relative overflow-hidden group hover:border-emerald-500/40 transition-colors shadow-[0_8px_30px_rgba(16,185,129,0.05)] min-h-[480px]"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-600/30 transition-colors" />
               
               <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest w-fit mb-6 border border-emerald-500/20">Artificial Intelligence</span>
               
               <h3 className="text-3xl font-bold text-white mb-4">AI Content Assistant</h3>
               <p className="text-stone-400 text-base mb-8 max-w-sm">Improve your content creation process with an AI Agent that performs all tasks for you, acting as your personal social media manager.</p>
               
               <div className="mt-auto relative w-full h-56 rounded-t-2xl bg-black/40 border border-white/10 border-b-0 overflow-hidden flex flex-col p-6 space-y-4 group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="flex items-start gap-3 w-[80%]">
                     <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                       <Sparkles className="w-4 h-4 text-emerald-400" />
                     </div>
                     <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 w-full">
                        <div className="w-full h-2 bg-white/20 rounded-full mb-3" />
                        <div className="w-2/3 h-2 bg-white/10 rounded-full" />
                     </div>
                  </div>
                  <div className="flex items-start gap-3 w-[80%] self-end flex-row-reverse">
                     <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center shrink-0 border border-stone-700">
                       <div className="w-4 h-4 rounded-full bg-stone-500" />
                     </div>
                     <div className="bg-[#D27D50]/20 border border-[#D27D50]/30 rounded-2xl rounded-tr-sm p-4 w-full">
                        <div className="w-3/4 h-2 bg-[#D27D50]/60 rounded-full" />
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* Card 5: AI Copywriter */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-[#120A0C] border border-rose-500/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col relative overflow-hidden group hover:border-rose-500/40 transition-colors shadow-[0_8px_30px_rgba(244,63,94,0.05)] min-h-[480px]"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/20 rounded-full blur-[80px] -z-10 group-hover:bg-rose-600/30 transition-colors" />
               
               <span className="inline-block px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest w-fit mb-6 border border-rose-500/20">Copywriting</span>
               
               <h3 className="text-3xl font-bold text-white mb-4">AI Copywriter</h3>
               <p className="text-stone-400 text-base mb-8 max-w-sm">Never stare at a blank page again. Generate high-converting captions, threads, and ad copy tailored precisely to your brand voice.</p>
               
               <div className="mt-auto relative w-full h-56 rounded-t-2xl bg-black/40 border border-white/10 border-b-0 overflow-hidden flex flex-col p-6 group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="w-full h-10 bg-white/5 border border-white/10 flex items-center gap-2 mb-4 rounded-t-xl px-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-stone-600" />
                     <div className="w-2.5 h-2.5 rounded-full bg-stone-600" />
                     <div className="w-2.5 h-2.5 rounded-full bg-stone-600" />
                  </div>
                  <div className="space-y-4 px-4 pt-2">
                     <div className="w-[90%] h-3 bg-rose-500/40 rounded-full" />
                     <div className="w-[80%] h-3 bg-white/20 rounded-full" />
                     <div className="w-[85%] h-3 bg-white/20 rounded-full" />
                     <div className="w-[60%] h-3 bg-white/20 rounded-full relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2 animate-[marquee_2s_linear_infinite]" />
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        </section>

        {/* Showcase Video Section */}
        <section className="container mx-auto px-4 py-20 max-w-6xl relative">
          {/* Ambient Glow behind the video container */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#D27D50]/5 via-transparent to-purple-600/5 rounded-[3rem] blur-3xl -z-10" />

          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#D27D50]" />
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-widest">
                See It In Action
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white"
            >
              Experience the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D27D50] via-[#E9967A] to-[#FFB6C1]">Future</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-stone-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            >
              Watch how our AI seamlessly crafts, edits, and schedules high-converting content across all your social channels.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative rounded-[2.5rem] p-2 md:p-3 bg-gradient-to-br from-white/20 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_80px_rgba(210,125,80,0.15)] group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#D27D50]/30 to-purple-600/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2.5rem] -z-10" />
            <div className="rounded-[2rem] overflow-hidden relative bg-black aspect-video flex items-center justify-center shadow-2xl border border-white/10">
              <video
                src="/showcase.mp4"
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />
              {/* Optional overlay for play button if needed, but native controls are enabled */}
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 relative z-10">
        <div className="container mx-auto px-4 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Anysocial Logo" className="h-8 w-auto object-contain brightness-0 invert opacity-50" />
          </div>
          <p className="text-stone-500 text-sm">
            &copy; {new Date().getFullYear()} Anysocial. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}