'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Play, Zap, Wand2, Calendar, ShoppingBag, Camera, Users, Briefcase } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';

const FEATURES = [
  { icon: Zap, title: 'AI-Powered', desc: 'Next-gen AI creates stunning content in seconds' },
  { icon: Calendar, title: 'Smart Scheduling', desc: 'Post at optimal times across all platforms' },
  { icon: Wand2, title: 'One-Click Campaigns', desc: 'Launch multi-platform campaigns instantly' },
  { icon: ShoppingBag, title: 'E-commerce Ready', desc: 'Sync with Shopify, WooCommerce & more' },
  { icon: Camera, title: 'Video Reels', desc: 'Generate engaging video content automatically' },
  { icon: Users, title: 'Team Collaboration', desc: 'Work together with roles & approvals' },
];

const STATS = [
  { value: '10×', label: 'Faster Content' },
  { value: '50+', label: 'Platforms' },
  { value: '1M+', label: 'Posts Created' },
  { value: '99.9%', label: 'Uptime' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F2F3ED] text-stone-900 font-sans">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[#0284C7] via-[#0082CD] to-[#0284C7] text-white pt-20 pb-24 px-4 rounded-b-[3.5rem] shadow-[0_25px_80px_rgba(2,132,199,0.35)] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-bottom opacity-50 pointer-events-none" 
             style={{ backgroundImage: "url('/sky_cloud_hero_bg.jpg')" }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full h-[450px] bg-sky-200/25 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto max-w-7xl px-4 relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <h1 className="font-bebas text-7xl md:text-9xl font-black tracking-widest">ABOUT NEWDONE</h1>
            <p className="text-xl md:text-2xl text-sky-100 max-w-3xl mx-auto font-light">
              We're on a mission to democratize social media marketing with AI.
              <br />
              Making professional content creation accessible to everyone.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-bebas text-5xl md:text-6xl font-black mb-6 uppercase">
                Our Story
              </h2>
              <p className="text-lg text-stone-600 mb-4 leading-relaxed">
                Newdone was born from a simple frustration: social media marketing shouldn't require
                a team of designers, copywriters, and schedulers. We saw businesses struggling to
                maintain a consistent presence across multiple platforms while creating quality content.
              </p>
              <p className="text-lg text-stone-600 mb-4 leading-relaxed">
                Today, Newdone empowers millions of creators, marketers, and businesses to create
                stunning visual content, schedule posts intelligently, and run full campaigns —
                all powered by cutting-edge AI.
              </p>
              <p className="text-lg text-stone-600 leading-relaxed">
                From Instagram carousels to TikTok reels, from Pinterest pins to LinkedIn articles —
                we're building the future of social media automation.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#CCFF00] to-[#bef264] p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-bebas text-8xl md:text-9xl font-black text-stone-900">AI</div>
                  <div className="text-2xl font-bold mt-4 text-stone-800">FIRST</div>
                  <div className="text-stone-700 mt-2">PLATFORM</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-bebas text-5xl md:text-6xl font-black uppercase mb-4">
              What We Offer
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Everything you need to dominate social media, powered by AI
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="bg-[#F2F3ED] rounded-2xl p-8 hover:shadow-xl transition-shadow"
              >
                <feature.icon className="w-12 h-12 text-[#0284C7] mb-4" />
                <h3 className="font-bebas text-2xl font-black uppercase mb-2">{feature.title}</h3>
                <p className="text-stone-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4 bg-[#0284C7] text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="font-bebas text-6xl md:text-7xl font-black text-[#CCFF00]">{stat.value}</div>
                <div className="text-lg text-sky-100 mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / Values Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-bebas text-5xl md:text-6xl font-black uppercase mb-4">
              Our Values
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Accessibility', desc: 'Professional tools for everyone, not just agencies' },
              { title: 'Innovation', desc: 'Pushing the boundaries of AI-powered creativity' },
              { title: 'Speed', desc: 'From idea to published content in minutes, not hours' },
            ].map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="bg-white rounded-2xl p-8 border-2 border-stone-200"
              >
                <div className="w-16 h-16 rounded-full bg-[#CCFF00] flex items-center justify-center mb-6">
                  <span className="font-bebas text-2xl font-black">{index + 1}</span>
                </div>
                <h3 className="font-bebas text-3xl font-black uppercase mb-3">{value.title}</h3>
                <p className="text-stone-600">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-[#F2F3ED]">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-bebas text-5xl md:text-7xl font-black uppercase mb-6">
              Ready to Transform<br />
              <span className="text-[#0284C7]">Your Social Media?</span>
            </h2>
            <p className="text-xl text-stone-600 mb-10 max-w-2xl mx-auto">
              Join thousands of creators and businesses using Newdone to create stunning content
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-[#0284C7] text-white font-bebas text-xl font-black uppercase px-10 py-4 rounded-full hover:bg-sky-700 transition-colors shadow-lg">
                Get Started Free
              </button>
              <button className="bg-[#CCFF00] text-black font-bebas text-xl font-black uppercase px-10 py-4 rounded-full hover:bg-[#bef264] transition-colors shadow-lg">
                Watch Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
