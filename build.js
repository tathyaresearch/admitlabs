const fs = require('fs');
const path = require('path');

const css = `
  :root {
    --black: #0A0A0C;
    --black-elevated: #121317;
    --graphite: #1A1B22;
    --graphite-lt: #262833;
    --graphite-border: rgba(244, 235, 217, 0.1);
    --graphite-border-hover: rgba(244, 235, 217, 0.3);
    
    --ivory: #F4EBD9;
    --ivory-card: #EAE1CF;
    --ivory-dim: #BCB4A4;
    --ivory-rule: #D5CCBC;
    
    --ink: #121316;
    --ink-dim: #545147;
    --ink-muted: #858071;
    
    --gold: #F0C75E;
    --gold-dim: rgba(240, 199, 94, 0.15);
    --gold-glow: rgba(240, 199, 94, 0.35);
    
    --slate: #8A8E99;
    --slate-light: #B4B8C2;
    
    --pad: clamp(16px, 4.5vw, 96px);
    --pad-y: clamp(48px, 6vw, 76px);
    --radius-sm: 2px;
    --radius-md: 4px;
    
    --font-main: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif;
    
    --transition-fast: 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    --transition-smooth: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  *, *::before, *::after {
    margin: 0; padding: 0; box-sizing: border-box;
    font-family: inherit;
  }
  
  html {
    scroll-behavior: smooth;
    scroll-padding-top: 80px;
    -webkit-text-size-adjust: 100%;
    background-color: var(--black);
    color: var(--ivory);
    overflow-x: hidden;
    max-width: 100vw;
    width: 100%;
  }

  /* Smooth Scroll Reveal Animations */
  .reveal-on-scroll {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity, transform;
  }
  .reveal-on-scroll.is-revealed {
    opacity: 1;
    transform: translateY(0);
  }

  .stagger-parent .reveal-child {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity, transform;
  }
  .stagger-parent.is-revealed .reveal-child {
    opacity: 1;
    transform: translateY(0);
  }
  .stagger-parent.is-revealed .reveal-child:nth-child(1) { transition-delay: 0.05s; }
  .stagger-parent.is-revealed .reveal-child:nth-child(2) { transition-delay: 0.12s; }
  .stagger-parent.is-revealed .reveal-child:nth-child(3) { transition-delay: 0.19s; }
  .stagger-parent.is-revealed .reveal-child:nth-child(4) { transition-delay: 0.26s; }
  .stagger-parent.is-revealed .reveal-child:nth-child(5) { transition-delay: 0.33s; }
  .stagger-parent.is-revealed .reveal-child:nth-child(6) { transition-delay: 0.40s; }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .reveal-on-scroll,
    .stagger-parent .reveal-child {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
  }
  
  body {
    font-family: var(--font-main);
    font-variation-settings: 'opsz' 14, 'wght' 400, 'wdth' 100;
    background-color: var(--black);
    color: var(--ivory);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    max-width: 100vw;
    width: 100%;
    position: relative;
  }

  /* Subtle noise texture */
  body::after {
    content: "";
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  ::selection {
    background: var(--gold);
    color: var(--black);
  }

  section {
    padding: var(--pad-y) var(--pad);
    position: relative;
    width: 100%;
    border-top: 1px solid var(--graphite-lt);
    box-sizing: border-box;
  }

  .wrap {
    max-width: 1280px;
    margin: 0 auto;
    width: 100%;
    position: relative;
  }

  .light {
    background-color: var(--ivory);
    color: var(--ink);
  }

  h1 {
    font-variation-settings: 'wght' 800, 'opsz' 84;
    font-size: clamp(38px, 5.2vw, 72px);
    line-height: 0.98;
    letter-spacing: -0.04em;
    text-transform: none;
  }

  h2 {
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(30px, 4.0vw, 52px);
    line-height: 1.0;
    letter-spacing: -0.035em;
    text-transform: none;
    color: var(--ivory);
    max-width: 24ch;
  }

  h3 {
    font-variation-settings: 'wght' 800, 'opsz' 40;
    font-size: clamp(19px, 2.2vw, 28px);
    line-height: 1.12;
    letter-spacing: -0.02em;
    text-transform: none;
  }

  h4 {
    font-variation-settings: 'wght' 700, 'opsz' 26;
    font-size: clamp(15px, 1.5vw, 20px);
    line-height: 1.28;
    letter-spacing: -0.015em;
  }

  .lede {
    font-size: clamp(15px, 1.25vw, 18.5px);
    color: var(--ivory-dim);
    max-width: 54ch;
    margin-top: clamp(16px, 2vw, 22px);
    line-height: 1.58;
    font-weight: 400;
  }
  .light .lede { color: var(--ink-dim); }

  .body-copy {
    font-size: clamp(14px, 1.05vw, 15.5px);
    color: var(--slate-light);
    line-height: 1.64;
  }
  .light .body-copy { color: var(--ink-dim); }

    /* Base Form & Button Typography Reset */
  button, input, select, textarea {
    font-family: var(--font-main);
  }

  /* Buttons */
  .btn,
  button.btn,
  a.btn,
  .btn-svc-action,
  .nav-cta-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: var(--font-main) !important;
    font-weight: 700 !important;
    font-variation-settings: 'wght' 700, 'opsz' 24 !important;
    font-size: 14.5px;
    letter-spacing: -0.015em;
    text-transform: none;
    padding: 14px 28px;
    border-radius: var(--radius-sm);
    text-decoration: none;
    cursor: pointer;
    border: none;
    -webkit-font-smoothing: antialiased;
    transition: transform var(--transition-fast), background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .btn-primary {
    background: var(--ivory);
    color: var(--black);
  }
  .btn-primary:hover {
    background: #fff;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(244, 235, 217, 0.15);
  }
  .btn-ghost {
    background: transparent;
    color: var(--ivory);
    border: 1px solid var(--graphite-border);
  }
  .btn-ghost:hover {
    border-color: var(--ivory);
    background: rgba(244, 235, 217, 0.06);
    transform: translateY(-2px);
  }
  .btn-dark {
    background: var(--ink);
    color: var(--ivory);
  }
  .btn-dark:hover {
    background: #000;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  }


  /* Nav */
  nav {
    position: fixed;
    top: 0; left: 0; width: 100%;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px var(--pad);
    background: rgba(10, 10, 12, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(244, 235, 217, 0.07);
    transition: padding var(--transition-fast), background var(--transition-fast);
  }
  nav.scrolled {
    padding: 14px var(--pad);
    background: rgba(10, 10, 12, 0.95);
    border-bottom-color: rgba(244, 235, 217, 0.12);
  }
  .nav-left { display: flex; align-items: center; }
  .brand-mark {
    font-family: var(--font-main) !important;
    font-size: clamp(22px, 2vw, 25px);
    letter-spacing: -0.035em;
    text-decoration: none;
    color: var(--ivory);
    display: inline-flex;
    align-items: baseline;
    -webkit-font-smoothing: antialiased;
  }
  .brand-mark b {
    font-family: var(--font-main) !important;
    font-weight: 800 !important;
    font-variation-settings: 'wght' 800, 'opsz' 40 !important;
    letter-spacing: -0.04em;
  }
  .brand-mark span {
    font-family: var(--font-main) !important;
    font-weight: 300 !important;
    font-variation-settings: 'wght' 300, 'opsz' 40 !important;
    color: var(--ivory-dim);
  }

  .nav-links { display: none; list-style: none; align-items: center; gap: clamp(16px, 1.8vw, 32px); }
  @media (min-width: 920px) { .nav-links { display: flex; } }
  .nav-link {
    font-family: var(--font-main) !important;
    color: var(--slate-light);
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 600 !important;
    font-variation-settings: 'wght' 600, 'opsz' 18 !important;
    letter-spacing: -0.01em;
    transition: color var(--transition-fast);
    position: relative;
    white-space: nowrap;
    -webkit-font-smoothing: antialiased;
  }
  .nav-link:hover { color: var(--ivory); }
  .nav-link::after {
    content: ""; position: absolute; bottom: -4px; left: 0; width: 0%; height: 1px;
    background: var(--gold); transition: width var(--transition-fast);
  }
  .nav-link:hover::after { width: 100%; }
  .nav-right { display: flex; align-items: center; gap: 14px; }
  .nav-cta-btn { padding: 10px 20px; font-size: 13px; font-weight: 700 !important; font-variation-settings: "wght" 700, "opsz" 20 !important; white-space: nowrap; }

  .menu-toggle {
    display: flex; flex-direction: column; justify-content: center;
    gap: 5px; width: 38px; height: 38px; background: var(--graphite);
    border: 1px solid var(--graphite-border); border-radius: var(--radius-sm);
    cursor: pointer; padding: 8px;
  }
  @media (min-width: 920px) { .menu-toggle { display: none; } }
  .menu-toggle span {
    display: block; width: 100%; height: 2px; background: var(--ivory);
    transition: transform var(--transition-fast), opacity var(--transition-fast);
  }
  .menu-toggle.active span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .menu-toggle.active span:nth-child(2) { opacity: 0; }
  .menu-toggle.active span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

  .mobile-drawer {
    position: fixed; top: 0; left: 0; width: 100%; height: 100vh; height: 100dvh;
    background: rgba(10, 10, 12, 0.98);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    z-index: 990;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 96px var(--pad) 36px;
    transform: translateY(-100%);
    transition: transform var(--transition-smooth);
    overflow-y: auto;
  }
  .mobile-drawer.open { transform: translateY(0); }
  .mobile-nav-links { list-style: none; display: flex; flex-direction: column; gap: 18px; }
  .mobile-nav-links a {
    font-family: var(--font-main) !important;
    font-size: clamp(22px, 5.5vw, 28px);
    font-weight: 700 !important;
    font-variation-settings: 'wght' 700, 'opsz' 36 !important;
    letter-spacing: -0.02em;
    text-decoration: none;
    color: var(--ivory);
    display: block;
    padding: 6px 0;
    -webkit-font-smoothing: antialiased;
    transition: color var(--transition-fast);
  }
  .mobile-nav-links a:hover,
  .mobile-nav-links a:active {
    color: var(--gold);
  }
  .mobile-drawer-footer { border-top: 1px solid var(--graphite-border); padding-top: 20px; }
  .mobile-drawer-footer .btn { width: 100%; min-height: 48px; }

  /* 01. Hero - Centered Full Screen Viewport */
  .hero {
    min-height: 100vh;
    min-height: 100dvh;
    box-sizing: border-box;
    padding-top: clamp(90px, 12vh, 140px);
    padding-bottom: clamp(60px, 8vh, 100px);
    background: radial-gradient(circle at 50% 35%, rgba(240, 199, 94, 0.05) 0%, transparent 65%),
                var(--black);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .hero-grid-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    background-size: 56px 56px;
    background-image: 
      linear-gradient(to right, rgba(244, 235, 217, 0.045) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(244, 235, 217, 0.045) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse 75% 65% at 50% 42%, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.25) 55%, transparent 88%);
    -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 42%, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.25) 55%, transparent 88%);
  }

  .hero-center-wrap {
    max-width: 960px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .hero-title {
    font-variation-settings: 'wght' 800, 'opsz' 84;
    font-size: clamp(38px, 5.2vw, 72px);
    line-height: 1.04;
    letter-spacing: -0.035em;
    text-transform: none;
    color: var(--ivory);
    margin-bottom: 0;
  }

  .hero-title mark {
    background: var(--ivory);
    color: var(--black);
    padding: 0 0.15em;
    margin: 0 0.04em;
    display: inline-block;
    border-radius: 2px;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: clamp(26px, 3.2vw, 36px);
  }

  /* 02. Proof Section */
  .proof-strip {
    background: var(--black-elevated);
    border-top: 1px solid var(--graphite-lt);
    border-bottom: 1px solid var(--graphite-lt);
    padding: clamp(44px, 5.5vw, 76px) var(--pad);
  }
  .proof-grid { display: grid; grid-template-columns: 1fr; gap: 36px; }
  @media (min-width: 768px) {
    .proof-grid { grid-template-columns: 1.4fr 2.6fr; align-items: center; gap: clamp(40px, 6vw, 80px); }
  }
  .bignum-stat { display: flex; flex-direction: column; }
  .bignum {
    font-variation-settings: 'wght' 800, 'opsz' 84; font-size: clamp(68px, 10.5vw, 136px);
    line-height: 0.88; letter-spacing: -0.05em; color: var(--ivory); margin-bottom: 6px;
  }
  .bignum-label {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 24;
    font-size: clamp(16px, 1.4vw, 20px);
    letter-spacing: -0.02em;
    text-transform: none;
    color: var(--gold);
  }
  .bignum-sub {
    font-size: 13.5px; color: var(--slate); margin-top: 6px;
  }
  .proof-narrative { border-left: 1px solid var(--graphite-lt); padding-left: clamp(20px, 4vw, 48px); }
  @media (max-width: 767px) {
    .proof-narrative { border-left: none; border-top: 1px solid var(--graphite-lt); padding-left: 0; padding-top: 24px; }
  }
  .proof-narrative p { font-size: clamp(15px, 1.2vw, 18px); line-height: 1.58; color: var(--ivory-dim); margin-bottom: 22px; }

  /* Brand Logo Slideshow */
  .brand-slideshow-wrap {
    overflow: hidden;
    width: 100%;
    position: relative;
    padding-top: 20px;
    border-top: 1px solid var(--graphite-lt);
    mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
  }
  .brand-slideshow-track {
    display: flex;
    width: max-content;
    animation: brandMarquee 26s linear infinite;
    align-items: center;
    gap: clamp(32px, 4.5vw, 64px);
  }
  @keyframes brandMarquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .brand-slideshow-wrap:hover .brand-slideshow-track {
    animation-play-state: paused;
  }
  .brand-logo-item {
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0.82;
    transition: opacity var(--transition-fast), transform var(--transition-fast);
    flex-shrink: 0;
  }
  .brand-logo-item:hover {
    opacity: 1;
    transform: scale(1.04);
  }
  .brand-logo-item svg {
    width: 22px;
    height: 22px;
    color: var(--ivory-dim);
  }
  .brand-logo-text {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 22;
    font-size: clamp(14px, 1.2vw, 16.5px);
    letter-spacing: -0.02em;
    text-transform: none;
    color: var(--ivory);
    white-space: nowrap;
  }

  /* 03. What We Do (The AdmitLabs Approach) */
  .approach-section {
    background: #000000;
    padding: clamp(64px, 8vw, 110px) var(--pad);
    border-top: 1px solid var(--graphite-lt);
    border-bottom: 1px solid var(--graphite-lt);
    width: 100%;
    overflow: hidden;
    font-family: var(--font-main);
  }
  .approach-split-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(40px, 5.5vw, 72px);
    align-items: center;
  }
  @media (min-width: 960px) {
    .approach-split-grid {
      grid-template-columns: 1.1fr 1fr;
    }
  }
  .approach-left-col h2 {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(30px, 4.0vw, 52px);
    line-height: 1.0;
    letter-spacing: -0.035em;
    color: var(--ivory);
    margin-bottom: 16px;
  }
  .approach-left-col .lede {
    font-family: var(--font-main);
  }
  .approach-steps-stack {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: clamp(28px, 3.5vw, 40px) 0;
  }
  .approach-step-card {
    background: #0D0E12;
    border: 1px solid rgba(244, 235, 217, 0.08);
    border-radius: var(--radius-sm);
    padding: 18px 22px;
    transition: transform var(--transition-fast), border-color var(--transition-fast);
  }
  .approach-step-card:hover {
    transform: translateX(4px);
    border-color: rgba(240, 199, 94, 0.4);
  }
  .step-index-tag {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 20;
    font-size: 14.5px;
    letter-spacing: -0.02em;
    text-transform: none;
    color: var(--gold);
    margin-bottom: 4px;
    display: block;
  }
  .step-desc-p {
    font-family: var(--font-main);
    font-size: 14px;
    color: var(--slate-light);
    line-height: 1.45;
  }

  /* Linear Flow Strip */
  .approach-flow-strip {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 14px 18px;
    background: rgba(240, 199, 94, 0.04);
    border: 1px solid rgba(240, 199, 94, 0.2);
    border-radius: var(--radius-sm);
  }
  .flow-node-tag {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 20;
    font-size: 13.5px;
    letter-spacing: -0.015em;
    text-transform: none;
    color: var(--ivory);
  }
  .flow-arrow-sym {
    color: var(--gold);
    font-size: 13px;
  }

  .approach-right-col {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .flywheel-kinetic-stage {
    position: relative;
    width: 100%;
    max-width: 460px;
    aspect-ratio: 1 / 0.96;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media (max-width: 768px) {
    .flywheel-kinetic-stage {
      aspect-ratio: auto;
      min-height: 400px;
    }
  }

  .flywheel-kinetic-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .flywheel-rotating-group {
    transform-origin: 230px 230px;
    animation: flywheelHarmonicSpin 50s linear infinite;
  }
  .flywheel-kinetic-stage:hover .flywheel-rotating-group {
    animation-duration: 25s;
  }

  @keyframes flywheelHarmonicSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .flywheel-center-core {
    position: relative;
    width: 145px;
    height: 145px;
    border-radius: 50%;
    background: radial-gradient(circle, #15161B 0%, #0A0A0C 100%);
    border: 1px solid rgba(240, 199, 94, 0.4);
    box-shadow: 0 0 35px rgba(0, 0, 0, 0.9), 0 0 20px rgba(240, 199, 94, 0.1), inset 0 0 16px rgba(240, 199, 94, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 14px;
    z-index: 5;
    transition: transform var(--transition-smooth), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .flywheel-kinetic-stage:hover .flywheel-center-core {
    border-color: var(--gold);
    transform: scale(1.04);
    box-shadow: 0 0 40px rgba(240, 199, 94, 0.18), inset 0 0 20px rgba(240, 199, 94, 0.06);
  }
  .flywheel-core-title {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 800, 'opsz' 40;
    font-size: 15px;
    line-height: 1.1;
    letter-spacing: -0.025em;
    text-transform: none;
    color: var(--ivory);
  }
  .flywheel-core-sub {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 18;
    font-size: 11px;
    color: var(--gold);
    letter-spacing: -0.01em;
    text-transform: none;
    margin-top: 4px;
  }

  .flywheel-satellite-node {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 11px;
    background: rgba(14, 15, 18, 0.9);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(244, 235, 217, 0.12);
    border-radius: 9999px;
    z-index: 6;
    transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
    animation: satelliteFloat 5s ease-in-out infinite alternate;
  }
  .flywheel-satellite-node:hover {
    transform: scale(1.05) translateY(-2px);
    border-color: rgba(240, 199, 94, 0.5);
    background: rgba(20, 21, 26, 0.96);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(240, 199, 94, 0.15);
  }

  .node-pos-top { top: 3%; left: 50%; transform: translateX(-50%); animation-delay: 0s; }
  .node-pos-top-right { top: 18%; right: 2%; animation-delay: 0.8s; }
  .node-pos-bottom-right { bottom: 18%; right: 2%; animation-delay: 1.6s; }
  .node-pos-bottom { bottom: 3%; left: 50%; transform: translateX(-50%); animation-delay: 2.4s; }
  .node-pos-bottom-left { bottom: 18%; left: 2%; animation-delay: 3.2s; }
  .node-pos-top-left { top: 18%; left: 2%; animation-delay: 4.0s; }

  @keyframes satelliteFloat {
    0% { transform: translateY(0px); }
    100% { transform: translateY(-4px); }
  }

  .node-app-badge {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 9.5px;
    font-weight: 700;
  }
  .badge-linkedin { background: #0A66C2; color: #fff; }
  .badge-instagram { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color: #fff; }
  .badge-youtube { background: #FF0000; color: #fff; }

  .node-meta {
    display: flex;
    flex-direction: column;
    text-align: left;
  }
  .node-platform-name {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 16;
    font-size: 11.5px;
    letter-spacing: -0.01em;
    color: var(--ivory);
    line-height: 1.2;
  }
  .node-format-role {
    font-family: var(--font-main);
    font-size: 10.5px;
    letter-spacing: -0.01em;
    text-transform: none;
    color: var(--slate);
    margin-top: 1px;
  }

  @media (max-width: 768px) {
    .flywheel-satellite-node {
      position: static;
      transform: none !important;
      animation: none !important;
      width: 100%;
      border-radius: var(--radius-sm);
    }
    .mobile-satellite-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 16px;
      width: 100%;
    }
    .desktop-only-nodes { display: none; }
  }
  @media (min-width: 769px) {
    .mobile-satellite-grid { display: none; }
  }

  /* 04. Services Section */
  .services-section {
    background: var(--black-elevated);
    padding: clamp(64px, 8vw, 110px) var(--pad);
    border-top: 1px solid var(--graphite-lt);
    border-bottom: 1px solid var(--graphite-lt);
    width: 100%;
    overflow: hidden;
    font-family: var(--font-main);
  }
  .services-header-block {
    max-width: 800px;
    margin-bottom: clamp(36px, 5vw, 60px);
  }
  .services-header-block h2 {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(30px, 4.2vw, 54px);
    line-height: 1.0;
    letter-spacing: -0.035em;
    color: var(--ivory);
    margin-bottom: 14px;
  }

  .services-grid-3col {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(20px, 2.5vw, 32px);
  }
  @media (min-width: 960px) {
    .services-grid-3col {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .svc-bespoke-card {
    background: var(--graphite);
    border: 1px solid var(--graphite-border);
    border-radius: var(--radius-md);
    padding: clamp(24px, 3vw, 36px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    transition: transform var(--transition-smooth), border-color var(--transition-fast), box-shadow var(--transition-fast);
    font-family: var(--font-main);
  }
  .svc-bespoke-card:hover {
    transform: translateY(-4px);
    border-color: rgba(244, 235, 217, 0.4);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  }
  .svc-bespoke-card.featured-tier {
    background: radial-gradient(circle at 50% 0%, rgba(240, 199, 94, 0.1) 0%, rgba(20, 21, 28, 1) 100%), #14151C;
    border: 1.5px solid var(--gold);
    box-shadow: 0 0 30px rgba(240, 199, 94, 0.15);
  }

  .svc-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--graphite-lt);
  }
  .svc-tag-mono {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 20;
    font-size: 13.5px;
    letter-spacing: -0.015em;
    text-transform: none;
    color: var(--gold);
  }
  .svc-cadence-pill {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 600, 'opsz' 16;
    font-size: 11.5px;
    letter-spacing: -0.01em;
    text-transform: none;
    padding: 4px 10px;
    background: rgba(244, 235, 217, 0.06);
    border: 1px solid rgba(244, 235, 217, 0.14);
    border-radius: var(--radius-sm);
    color: var(--ivory-dim);
  }

  .svc-main-title {
    font-family: var(--font-main) !important;
    font-variation-settings: 'wght' 800, 'opsz' 48 !important;
    font-size: clamp(24px, 2.4vw, 32px);
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: var(--ivory);
    margin-bottom: 14px;
  }
  .svc-lead-summary {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 400, 'opsz' 18;
    font-size: 14px;
    color: var(--slate-light);
    line-height: 1.55;
    margin-bottom: 16px;
  }
  .svc-target-sub {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 500, 'opsz' 16;
    font-size: 13px;
    color: var(--ivory-dim);
    line-height: 1.45;
    padding: 10px 12px;
    background: rgba(0,0,0,0.3);
    border-left: 2px solid var(--gold);
    border-radius: 2px;
    margin-bottom: 24px;
  }

  .svc-output-matrix {
    background: var(--black);
    border: 1px solid var(--graphite-lt);
    border-radius: var(--radius-sm);
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: var(--font-main);
  }
  .svc-output-matrix-title {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 600, 'opsz' 16;
    font-size: 11.5px;
    letter-spacing: -0.01em;
    text-transform: none;
    color: var(--slate);
    margin-bottom: 4px;
  }
  .svc-output-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12.5px;
    color: var(--ivory-dim);
    gap: 8px;
  }
  .svc-output-row span:first-child {
    font-variation-settings: 'wght' 400;
  }
  .svc-output-pill {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 16;
    font-size: 11.5px;
    letter-spacing: -0.01em;
    text-transform: none;
    padding: 3px 8px;
    background: rgba(240, 199, 94, 0.08);
    border: 1px solid rgba(240, 199, 94, 0.25);
    color: var(--gold);
    border-radius: 3px;
    white-space: nowrap;
  }

  .svc-process-note {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 400, 'opsz' 16;
    font-size: 12px;
    color: var(--slate);
    line-height: 1.45;
    margin-bottom: 22px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .svc-process-note svg {
    width: 13px;
    height: 13px;
    color: var(--gold);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .btn-svc-action {
    width: 100%;
    padding: 13px 20px;
    font-family: var(--font-main) !important;
    font-variation-settings: 'wght' 700, 'opsz' 20 !important;
    font-size: 13.5px;
    text-transform: none;
    letter-spacing: -0.015em;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all var(--transition-fast);
    border: 1px solid var(--graphite-border);
    background: var(--graphite);
    color: var(--ivory);
  }
  .btn-svc-action:hover {
    border-color: var(--ivory);
    background: var(--graphite-lt);
    transform: translateY(-2px);
  }
  .svc-bespoke-card.featured-tier .btn-svc-action {
    background: var(--gold);
    color: #0A0A0C;
    border-color: var(--gold);
  }
  .svc-bespoke-card.featured-tier .btn-svc-action:hover {
    background: #FDE68A;
    box-shadow: 0 8px 24px rgba(240, 199, 94, 0.35);
  }

  /* 05. Selected Work (4 Reels) */
  .work-section {
    background: var(--black-elevated);
    padding: clamp(64px, 8vw, 110px) var(--pad);
    border-top: 1px solid var(--graphite-lt);
    border-bottom: 1px solid var(--graphite-lt);
    position: relative;
    overflow: hidden;
    width: 100%;
  }
  .work-header-center {
    text-align: center;
    max-width: 840px;
    margin: 0 auto clamp(36px, 4.5vw, 60px);
  }
  .work-header-center h2 {
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(30px, 4.2vw, 54px);
    line-height: 1.05;
    letter-spacing: -0.035em;
    color: var(--ivory);
    margin-bottom: 14px;
  }
  .work-header-center .lede {
    margin: 0 auto;
    font-size: clamp(14.5px, 1.15vw, 17.5px);
    color: var(--slate-light);
    max-width: 58ch;
  }

  .reels-grid-4col {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(16px, 2vw, 24px);
    max-width: 1240px;
    margin: 0 auto;
    width: 100%;
  }
  @media (min-width: 540px) {
    .reels-grid-4col {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 960px) {
    .reels-grid-4col {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 539px) {
    .reels-grid-4col {
      max-width: 290px;
      margin: 0 auto;
    }
  }
  .reel-card-item {
    position: relative;
    aspect-ratio: 9 / 16;
    background: #0A0B0E;
    border: 1px solid rgba(244, 235, 217, 0.12);
    border-radius: 18px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 16px;
    cursor: pointer;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
    transition: transform var(--transition-smooth), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .reel-card-item:hover {
    transform: translateY(-6px);
    border-color: rgba(240, 199, 94, 0.5);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(240, 199, 94, 0.15);
  }

  .reel-media-placeholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, rgba(14, 15, 20, 0.3) 0%, rgba(10, 11, 14, 0.92) 100%), #0E0F14;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }
  .reel-media-placeholder img,
  .reel-media-placeholder video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.85) contrast(1.05);
    transition: transform var(--transition-smooth), filter var(--transition-fast);
  }
  .reel-card-item:hover .reel-media-placeholder img,
  .reel-card-item:hover .reel-media-placeholder video {
    transform: scale(1.04);
    filter: brightness(0.95) contrast(1.08);
  }

  .reel-top-bar {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .reel-format-badge {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 16;
    font-size: 11.5px;
    letter-spacing: -0.01em;
    text-transform: none;
    color: var(--ivory);
    background: rgba(10, 10, 12, 0.75);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(244, 235, 217, 0.16);
    padding: 4px 10px;
    border-radius: 4px;
  }
  .reel-brand-tag {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 16;
    font-size: 11px;
    letter-spacing: -0.01em;
    color: var(--gold);
  }

  .reel-play-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: rgba(244, 235, 217, 0.92);
    color: var(--black);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
    transition: transform var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
  }
  .reel-play-btn svg {
    margin-left: 2px;
  }
  .reel-card-item:hover .reel-play-btn {
    transform: translate(-50%, -50%) scale(1.12);
    background: #FFFFFF;
    box-shadow: 0 10px 32px rgba(240, 199, 94, 0.4);
  }

  .reel-bottom-bar {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: center;
  }
  .reel-caption-pill {
    background: rgba(18, 19, 24, 0.9);
    border: 1px solid rgba(244, 235, 217, 0.18);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--ivory);
    font-size: 11px;
    line-height: 1.35;
    padding: 5px 10px;
    border-radius: 4px;
    max-width: 90%;
  }
  .reel-title-label {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 20;
    font-size: 13px;
    color: var(--ivory);
    letter-spacing: -0.01em;
  }

  /* 06. Who We Work With (Archetype Cards) */
  .who-cards-section {
    background: var(--black);
    padding: clamp(70px, 8.5vw, 120px) var(--pad);
    border-top: 1px solid var(--graphite-lt);
    border-bottom: 1px solid var(--graphite-lt);
    width: 100%;
    overflow: hidden;
    position: relative;
  }
  .who-header-center {
    text-align: center;
    max-width: 820px;
    margin: 0 auto clamp(40px, 5vw, 68px);
  }
  .who-header-center h2 {
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(32px, 4.4vw, 56px);
    line-height: 1.02;
    letter-spacing: -0.035em;
    color: var(--ivory);
    margin-bottom: 16px;
  }
  .who-header-center h2 em {
    font-style: italic;
    font-weight: 300;
    color: var(--ivory);
  }
  .who-header-center .lede {
    margin: 0 auto;
    font-size: clamp(15px, 1.2vw, 18px);
    color: var(--slate-light);
    max-width: 54ch;
  }

  .who-cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(20px, 2.2vw, 30px);
    max-width: 1280px;
    margin: 0 auto;
    width: 100%;
    align-items: stretch;
  }
  @media (min-width: 600px) {
    .who-cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 1060px) {
    .who-cards-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .who-archetype-card {
    background: radial-gradient(circle at 50% 0%, rgba(26, 27, 34, 0.8) 0%, rgba(13, 14, 18, 0.95) 100%), #0D0E12;
    border: 1px solid rgba(244, 235, 217, 0.1);
    border-radius: 6px;
    padding: clamp(26px, 2.8vw, 36px) clamp(22px, 2.4vw, 30px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    transition: transform var(--transition-smooth), border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
  }
  .who-archetype-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: transparent;
    transition: background var(--transition-fast);
  }
  .who-archetype-card:hover {
    transform: translateY(-6px);
    border-color: rgba(240, 199, 94, 0.45);
    background: radial-gradient(circle at 50% 0%, rgba(32, 34, 44, 0.95) 0%, rgba(15, 16, 22, 1) 100%), #101116;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(240, 199, 94, 0.12);
  }
  .who-archetype-card:hover::before {
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }

  .who-card-icon-badge {
    width: 44px;
    height: 44px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
    transition: transform var(--transition-fast);
  }
  .who-archetype-card:hover .who-card-icon-badge {
    transform: scale(1.08);
  }

  /* Distinctive Category Badge Accents */
  .badge-acc-blue {
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #38bdf8;
  }
  .badge-acc-gold {
    background: rgba(240, 199, 94, 0.1);
    border: 1px solid rgba(240, 199, 94, 0.35);
    color: var(--gold);
  }
  .badge-acc-pink {
    background: rgba(236, 72, 153, 0.1);
    border: 1px solid rgba(236, 72, 153, 0.3);
    color: #ec4899;
  }
  .badge-acc-purple {
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.3);
    color: #c084fc;
  }

  .who-card-title {
    font-variation-settings: 'wght' 800, 'opsz' 40;
    font-size: clamp(20px, 1.9vw, 24px);
    line-height: 1.15;
    letter-spacing: -0.025em;
    color: var(--ivory);
    margin-bottom: 10px;
  }

  .who-card-ambition-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--gold);
    background: rgba(240, 199, 94, 0.08);
    border: 1px solid rgba(240, 199, 94, 0.22);
    padding: 4px 10px;
    border-radius: 3px;
    margin-bottom: 16px;
    width: fit-content;
  }

  .who-card-body-p {
    font-size: 14px;
    color: var(--slate-light);
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .who-card-foot-tag {
    padding-top: 14px;
    border-top: 1px solid rgba(244, 235, 217, 0.08);
    font-size: 12.5px;
    color: var(--ivory-dim);
    line-height: 1.45;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .who-card-foot-tag svg {
    width: 14px;
    height: 14px;
    color: var(--gold);
    flex-shrink: 0;
    margin-top: 2px;
  }

  
  /* 07. How We Work / How It Works (Visual Studio Orbit) */
  .time-section {
    background: #000000;
    color: var(--ivory);
    padding: clamp(70px, 9vw, 120px) var(--pad);
    position: relative;
    border-top: 1px solid var(--graphite-lt);
    border-bottom: 1px solid var(--graphite-lt);
    overflow: hidden;
    width: 100%;
    font-family: var(--font-main);
  }
  .time-grid-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    background-size: 48px 48px;
    background-image: 
      linear-gradient(to right, rgba(244, 235, 217, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(244, 235, 217, 0.04) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 90%);
    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 90%);
  }

  .how-stage-grid {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(32px, 4vw, 48px);
    align-items: center;
    max-width: 1280px;
    margin: 0 auto;
  }
  @media (min-width: 1020px) {
    .how-stage-grid {
      grid-template-columns: 1fr 1.35fr 1fr;
      gap: clamp(24px, 3vw, 40px);
    }
  }

  .how-cards-col {
    display: flex;
    flex-direction: column;
    gap: clamp(20px, 2.5vw, 28px);
  }

  .studio-team-card {
    background: #0E0F14;
    border: 1px solid rgba(244, 235, 217, 0.12);
    border-radius: 12px;
    padding: clamp(18px, 2vw, 24px);
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65);
    transition: transform var(--transition-smooth), border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
    cursor: default;
    position: relative;
    font-family: var(--font-main);
  }
  .studio-team-card:hover {
    transform: rotate(0deg) translateY(-4px) scale(1.03) !important;
    border-color: rgba(240, 199, 94, 0.5);
    background: #13141B;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(240, 199, 94, 0.12);
  }

  /* Organic Card Tilts on Desktop */
  @media (min-width: 1020px) {
    .card-tilt-l1 { transform: rotate(-3deg); }
    .card-tilt-l2 { transform: rotate(-1.5deg); }
    .card-tilt-l3 { transform: rotate(-3.5deg); }
    .card-tilt-r1 { transform: rotate(3deg); }
    .card-tilt-r2 { transform: rotate(1.5deg); }
    .card-tilt-r3 { transform: rotate(3.5deg); }
  }

  .team-card-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: rgba(196, 181, 253, 0.1);
    border: 1px solid rgba(196, 181, 253, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #c4b5fd;
    transition: transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
  }
  .studio-team-card:hover .team-card-icon-wrap {
    transform: scale(1.08);
    background: rgba(240, 199, 94, 0.15);
    border-color: rgba(240, 199, 94, 0.4);
    color: var(--gold);
  }
  .team-card-icon-wrap svg {
    width: 24px;
    height: 24px;
  }

  .team-card-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-family: var(--font-main);
  }
  .team-card-role-title {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 800, 'opsz' 28;
    font-size: clamp(16px, 1.4vw, 19px);
    letter-spacing: -0.02em;
    color: var(--ivory);
    line-height: 1.2;
  }
  .team-card-role-sub {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 400, 'opsz' 16;
    font-size: 13px;
    color: var(--slate-light);
    line-height: 1.4;
  }

  /* Center Focal Hub */
  .how-center-focal {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: clamp(20px, 3vw, 36px) 16px;
    font-family: var(--font-main);
  }

  .how-hub-title {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(30px, 3.8vw, 48px);
    line-height: 1.05;
    letter-spacing: -0.035em;
    color: var(--ivory);
    margin-bottom: 16px;
  }
  .how-hub-title span.gold-highlight {
    color: var(--gold);
    display: inline;
  }

  .how-hub-sub {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 400, 'opsz' 18;
    font-size: clamp(14.5px, 1.15vw, 17px);
    color: var(--slate-light);
    line-height: 1.55;
    max-width: 44ch;
    margin: 0 auto clamp(24px, 3vw, 32px);
  }

  /* Redesigned Premium Advantage Capsule */
  .how-advantage-capsule {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    background: linear-gradient(180deg, rgba(26, 27, 36, 0.9) 0%, rgba(14, 15, 20, 0.95) 100%);
    border: 1px solid rgba(240, 199, 94, 0.35);
    border-radius: 9999px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    font-family: var(--font-main);
    transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .how-advantage-capsule:hover {
    transform: translateY(-2px);
    border-color: var(--gold);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(240, 199, 94, 0.2);
  }
  .adv-side-you {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 600, 'opsz' 18;
    font-size: 13.5px;
    letter-spacing: -0.015em;
    color: var(--ivory);
  }
  .adv-arrow-sym {
    color: var(--gold);
    font-size: 14px;
    line-height: 1;
    font-weight: 700;
  }
  .adv-side-admit {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 18;
    font-size: 13.5px;
    letter-spacing: -0.015em;
    color: var(--gold);
  }

  /* 08. Final CTA */
  .cta-section {
    background: var(--black);
    padding: clamp(64px, 8vw, 110px) var(--pad);
    border-top: 1px solid var(--graphite-lt);
    border-bottom: 1px solid var(--graphite-lt);
    text-align: center;
  }
  .cta-box {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .cta-box h2 {
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(32px, 4.4vw, 56px);
    line-height: 1.0;
    letter-spacing: -0.035em;
    color: var(--ivory);
    margin-bottom: 14px;
  }
  .cta-actions-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: clamp(24px, 3.5vw, 40px);
    width: 100%;
  }
  @media (max-width: 540px) {
    .cta-actions-row {
      flex-direction: column;
      max-width: 320px;
    }
    .cta-actions-row .btn {
      width: 100%;
      min-height: 48px;
    }
  }

  /* 09. FAQ */
  .faq-section {
    background: var(--black-elevated);
    padding: clamp(64px, 8vw, 110px) var(--pad);
  }
  .faq-section h2 {
    margin-bottom: clamp(32px, 4vw, 52px);
  }
  .faq-accordion {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--graphite-lt);
    max-width: 900px;
  }
  .faq-item {
    border-bottom: 1px solid var(--graphite-lt);
  }
  .faq-question {
    padding: 22px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-variation-settings: 'wght' 700, 'opsz' 28;
    font-size: clamp(16px, 1.6vw, 20px);
    letter-spacing: -0.02em;
    color: var(--ivory);
    list-style: none;
    user-select: none;
  }
  .faq-question::-webkit-details-marker { display: none; }
  .faq-icon {
    font-size: 22px;
    color: var(--gold);
    transition: transform var(--transition-fast);
    font-weight: 300;
  }
  .faq-item[open] .faq-icon {
    transform: rotate(45deg);
  }
  .faq-answer {
    padding-bottom: 24px;
    font-size: 15px;
    color: var(--slate-light);
    line-height: 1.65;
    max-width: 68ch;
  }

  /* 10. Footer with Fluid Canvas Smoke */
  footer {
    background: #000000;
    color: var(--ivory);
    padding: clamp(64px, 8vw, 100px) 0 0;
    position: relative;
    overflow: hidden;
    width: 100%;
    border-top: 1px solid var(--graphite-lt);
  }
  footer > .wrap {
    padding: 0 var(--pad);
  }
  .footer-top-grid {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 32px;
    margin-bottom: clamp(40px, 6vw, 64px);
  }
  @media (min-width: 768px) {
    .footer-top-grid {
      flex-direction: row;
      align-items: flex-start;
    }
  }
  .footer-tagline-text {
    font-size: clamp(16px, 1.4vw, 20px);
    color: var(--ivory-dim);
    line-height: 1.4;
    max-width: 32ch;
  }
  .footer-nav-list {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(16px, 2.5vw, 32px);
    list-style: none;
  }
  .footer-nav-list a {
    color: var(--slate-light);
    text-decoration: none;
    font-size: 14px;
    font-family: var(--font-main);
    letter-spacing: 0.05em;
    transition: color var(--transition-fast);
  }
  .footer-nav-list a:hover {
    color: var(--ivory);
  }
  .footer-email-link {
    font-family: var(--font-main);
    font-size: 14px;
    color: var(--gold);
    text-decoration: none;
  }
  .footer-email-link:hover {
    text-decoration: underline;
  }

  /* Monumental Brand Logo Stage with Smoke Bedrock */
  .footer-smoke-monument {
    position: relative;
    width: 100%;
    min-height: clamp(180px, 26vw, 320px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    margin-top: 20px;
    background: #000000;
  }
  .monumental-brand-logo {
    font-family: var(--font-main);
    font-size: clamp(48px, 15vw, 240px);
    line-height: 0.82;
    letter-spacing: -0.04em;
    user-select: none;
    pointer-events: none;
    position: relative;
    z-index: 2;
    text-align: center;
    margin-bottom: -0.08em;
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
  }
  .monumental-brand-logo b {
    font-variation-settings: 'wght' 800, 'opsz' 144;
    letter-spacing: -0.045em;
    color: var(--ivory);
  }
  .monumental-brand-logo span {
    font-variation-settings: 'wght' 300, 'opsz' 144;
    letter-spacing: -0.035em;
    color: var(--ivory-dim);
  }
  .smoke-canvas-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
    mix-blend-mode: screen;
  }

  .footer-bottom-bar {
    padding: 24px var(--pad);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid rgba(244, 235, 217, 0.08);
    position: relative;
    z-index: 10;
    background: #000000;
  }
  @media (min-width: 600px) {
    .footer-bottom-bar {
      flex-direction: row;
    }
  }
  .footer-copy-text {
    font-family: var(--font-main);
    font-size: 11px;
    color: var(--slate);
    letter-spacing: 0.04em;
  }

  /* Modals */
  .modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(10, 10, 12, 0.88); backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px); z-index: 2000;
    display: flex; align-items: center; justify-content: center;
    padding: 20px; opacity: 0; pointer-events: none; transition: opacity var(--transition-fast);
  }
  .modal-overlay.active { opacity: 1; pointer-events: auto; }
  .modal-box {
    background: var(--black-elevated); border: 1px solid var(--graphite-border);
    border-radius: var(--radius-md); width: 100%; max-width: 620px; max-height: 90vh;
    overflow-y: auto; padding: clamp(28px, 4vw, 44px); box-shadow: 0 32px 80px rgba(0, 0, 0, 0.9);
    position: relative; transform: translateY(20px); transition: transform var(--transition-smooth);
  }
  .modal-overlay.active .modal-box { transform: translateY(0); }
  .modal-close-btn {
    position: absolute; top: 20px; right: 20px; width: 36px; height: 36px;
    background: var(--graphite); border: 1px solid var(--graphite-border);
    border-radius: 50%; color: var(--ivory); font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .modal-form { display: flex; flex-direction: column; gap: 18px; margin-top: 24px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 600, 'opsz' 16;
    font-size: 12.5px;
    letter-spacing: -0.01em;
    text-transform: none;
    color: var(--slate);
  }
  .form-group input, .form-group select, .form-group textarea {
    background: var(--black); border: 1px solid var(--graphite-border); border-radius: var(--radius-sm);
    padding: 12px 14px; color: var(--ivory); font-family: var(--font-main); font-size: 14.5px;
    outline: none; transition: border-color var(--transition-fast);
  }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--gold); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

const bodyHtml = `
<!-- NAVIGATION -->
<nav id="navbar">
  <div class="nav-left">
    <a href="#" class="brand-mark" aria-label="AdmitLabs Home">
      <b>Admit</b><span>Labs</span>
    </a>
  </div>

  <ul class="nav-links">
    <li><a href="#approach" class="nav-link">Process</a></li>
    <li><a href="#services" class="nav-link">Services</a></li>
    <li><a href="#work" class="nav-link">Work</a></li>
    <li><a href="#who" class="nav-link">Clients</a></li>
    <li><a href="#process" class="nav-link">How It Works</a></li>
    <li><a href="#faq" class="nav-link">FAQ</a></li>
  </ul>

  <div class="nav-right">
    <button class="btn btn-primary nav-cta-btn" onclick="openIntakeModal()">
      Work with AdmitLabs
    </button>
    <button class="menu-toggle" id="menuToggle" aria-label="Toggle Navigation Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- Mobile Navigation Drawer -->
<div class="mobile-drawer" id="mobileDrawer">
  <ul class="mobile-nav-links">
    <li><a href="#approach" onclick="closeMobileMenu()">01 Process</a></li>
    <li><a href="#services" onclick="closeMobileMenu()">02 Services</a></li>
    <li><a href="#work" onclick="closeMobileMenu()">03 Work</a></li>
    <li><a href="#who" onclick="closeMobileMenu()">04 Clients</a></li>
    <li><a href="#process" onclick="closeMobileMenu()">05 How It Works</a></li>
    <li><a href="#faq" onclick="closeMobileMenu()">06 FAQ</a></li>
  </ul>
  <div class="mobile-drawer-footer">
    <button class="btn btn-primary" style="width: 100%" onclick="closeMobileMenu(); openIntakeModal();">
      Work with AdmitLabs
    </button>
  </div>
</div>

<!-- 01. HERO SECTION -->
<section class="hero" id="hero">
  <div class="hero-grid-bg" aria-hidden="true"></div>
  <div class="wrap">
    <div class="hero-center-wrap reveal-on-scroll is-revealed">
      <h1 class="hero-title">
        We turn education<br>
        <mark>outcomes</mark> into demand.
      </h1>
      
      <p class="lede" style="margin: clamp(18px, 2.2vw, 24px) auto 0; max-width: 56ch; text-align: center;">
        We turn your institution's outcomes, expertise and people into content that earns attention, builds trust and creates demand.
      </p>
      
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="openIntakeModal()">
          Work with AdmitLabs
        </button>
        <a href="#work" class="btn btn-ghost">
          See our work
        </a>
      </div>
    </div>
  </div>
</section>

<!-- 02. PROOF SECTION -->
<div class="proof-strip" id="proof">
  <div class="wrap proof-grid reveal-on-scroll">
    <div class="bignum-stat">
      <div class="bignum">120+</div>
      <div class="bignum-label">Education brands.</div>
      <div class="bignum-sub">Built exclusively inside education.</div>
    </div>
    
    <div class="proof-narrative">
      <p>
        Our experience comes from working with institutions, education brands and leaders, not adapting generic agency playbooks to education.
      </p>
      
      <!-- Brand Logos Slideshow (In Ivory) -->
      <div class="brand-slideshow-wrap">
        <div class="brand-slideshow-track">
          <!-- Logo 1: Ashoka -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
            <span class="brand-logo-text">Ashoka Academy</span>
          </div>
          <!-- Logo 2: Plaksha -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.8"/></svg>
            <span class="brand-logo-text">Plaksha Tech</span>
          </div>
          <!-- Logo 3: Krea -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,3 21,19 3,19" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
            <span class="brand-logo-text">Krea University</span>
          </div>
          <!-- Logo 4: Masters' Union -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
            <span class="brand-logo-text">Masters' Union</span>
          </div>
          <!-- Logo 5: St. Jude -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
            <span class="brand-logo-text">St. Jude College</span>
          </div>
          <!-- Logo 6: Apex -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 18H4L12 2z" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
            <span class="brand-logo-text">Apex Institute</span>
          </div>
          <!-- Logo 7: Beacon -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.8"/></svg>
            <span class="brand-logo-text">Beacon College</span>
          </div>

          <!-- Duplicate items for seamless continuous looping -->
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
            <span class="brand-logo-text">Ashoka Academy</span>
          </div>
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.8"/></svg>
            <span class="brand-logo-text">Plaksha Tech</span>
          </div>
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,3 21,19 3,19" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
            <span class="brand-logo-text">Krea University</span>
          </div>
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
            <span class="brand-logo-text">Masters' Union</span>
          </div>
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
            <span class="brand-logo-text">St. Jude College</span>
          </div>
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 18H4L12 2z" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
            <span class="brand-logo-text">Apex Institute</span>
          </div>
          <div class="brand-logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.8"/></svg>
            <span class="brand-logo-text">Beacon College</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 03. WHAT WE DO (THE ADMITLABS APPROACH) -->
<section class="approach-section" id="process">
  <div class="wrap">
    <div class="approach-split-grid reveal-on-scroll">
      <!-- Left Column: Process & Narrative -->
      <div class="approach-left-col">
        <h2>From outcomes to demand.</h2>
        <p class="lede">
          We find what makes your institution worth talking about and turn it into stories people remember.
        </p>

        <div class="approach-steps-stack">
          <!-- Step 01 -->
          <div class="approach-step-card">
            <span class="step-index-tag">01 / Find the proof</span>
            <p class="step-desc-p">Identify the outcomes, expertise, people and ideas worth talking about.</p>
          </div>

          <!-- Step 02 -->
          <div class="approach-step-card">
            <span class="step-index-tag">02 / Build the story</span>
            <p class="step-desc-p">Turn that proof into clear narratives and content people want to engage with.</p>
          </div>

          <!-- Step 03 -->
          <div class="approach-step-card">
            <span class="step-index-tag">03 / Create attention</span>
            <p class="step-desc-p">Put those stories in front of the audiences that matter.</p>
          </div>
        </div>

        <!-- Linear Flow Strip -->
        <div class="approach-flow-strip">
          <span class="flow-node-tag">Proof</span>
          <span class="flow-arrow-sym">→</span>
          <span class="flow-node-tag">Story</span>
          <span class="flow-arrow-sym">→</span>
          <span class="flow-node-tag">Attention</span>
          <span class="flow-arrow-sym">→</span>
          <span class="flow-node-tag" style="color: var(--gold);">Demand</span>
        </div>
      </div>

      <!-- Right Column: Animated Kinetic Content Flywheel -->
      <div class="approach-right-col">
        <div class="flywheel-kinetic-stage">
          <!-- Animated Geometric Octagonal Harmonic Flux -->
          <svg class="flywheel-kinetic-svg" viewBox="0 0 460 460" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="kineticFlywheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#F0C75E" stop-opacity="0.9" />
                <stop offset="50%" stop-color="#F4EBD9" stop-opacity="0.75" />
                <stop offset="100%" stop-color="#F0C75E" stop-opacity="0.9" />
              </linearGradient>
            </defs>
            <circle cx="230" cy="230" r="168" stroke="rgba(244, 235, 217, 0.08)" stroke-width="1" stroke-dasharray="3 4"/>
            <circle cx="230" cy="230" r="70" stroke="rgba(240, 199, 94, 0.25)" stroke-width="1"/>
            <line x1="230" y1="40" x2="230" y2="420" stroke="rgba(244, 235, 217, 0.05)" stroke-width="1" stroke-dasharray="2 4"/>
            <line x1="40" y1="230" x2="420" y2="230" stroke="rgba(244, 235, 217, 0.05)" stroke-width="1" stroke-dasharray="2 4"/>
            <g class="flywheel-rotating-group">
              <polygon points="304.0,230.0 282.3,282.3 230.0,304.0 177.7,282.3 156.0,230.0 177.7,177.7 230.0,156.0 282.3,177.7" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="0.85" stroke-opacity="0.12" />
              <polygon points="309.0,235.8 281.8,290.0 224.2,309.0 170.0,281.8 151.0,224.2 178.2,170.0 235.8,151.0 290.0,178.2" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="0.88" stroke-opacity="0.16" />
              <polygon points="313.5,242.3 280.3,297.8 217.7,313.5 162.2,280.3 146.5,217.7 179.7,162.2 242.3,146.5 297.8,179.7" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="0.90" stroke-opacity="0.20" />
              <polygon points="317.4,249.5 278.0,305.7 210.5,317.4 154.3,278.0 142.6,210.5 182.0,154.3 249.5,142.6 305.7,182.0" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="0.92" stroke-opacity="0.24" />
              <polygon points="320.8,257.4 274.8,313.5 202.6,320.8 146.5,274.8 139.2,202.6 185.2,146.5 257.4,139.2 313.5,185.2" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="0.95" stroke-opacity="0.28" />
              <polygon points="323.4,265.8 270.7,321.4 194.2,323.4 138.6,270.7 136.6,194.2 189.3,138.6 265.8,136.6 321.4,189.3" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="0.97" stroke-opacity="0.31" />
              <polygon points="325.2,274.8 265.6,329.0 185.2,325.2 131.0,265.6 134.8,185.2 194.4,131.0 274.8,134.8 329.0,194.4" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.00" stroke-opacity="0.35" />
              <polygon points="326.2,284.2 259.7,336.3 175.8,326.2 123.7,259.7 133.8,175.8 200.3,123.7 284.2,133.8 336.3,200.3" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.02" stroke-opacity="0.39" />
              <polygon points="326.3,294.0 252.8,343.3 166.0,326.3 116.7,252.8 133.7,166.0 207.2,116.7 294.0,133.7 343.3,207.2" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.05" stroke-opacity="0.43" />
              <polygon points="325.5,304.0 245.1,349.8 156.0,325.5 110.2,245.1 134.5,156.0 214.9,110.2 304.0,134.5 349.8,214.9" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.07" stroke-opacity="0.47" />
              <polygon points="323.6,314.3 236.6,355.8 145.7,323.6 104.2,236.6 136.4,145.7 223.4,104.2 314.3,136.4 355.8,223.4" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.10" stroke-opacity="0.51" />
              <polygon points="320.8,324.7 227.3,361.2 135.3,320.8 98.8,227.3 139.2,135.3 232.7,98.8 324.7,139.2 361.2,232.7" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.13" stroke-opacity="0.55" />
              <polygon points="316.9,335.1 217.2,365.8 124.9,316.9 94.2,217.2 143.1,124.9 242.8,94.2 335.1,143.1 365.8,242.8" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.15" stroke-opacity="0.59" />
              <polygon points="312.0,345.4 206.4,369.6 114.6,312.0 90.4,206.4 148.0,114.6 253.6,90.4 345.4,148.0 369.6,253.6" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.18" stroke-opacity="0.63" />
              <polygon points="306.0,355.6 195.0,372.6 104.4,306.0 87.4,195.0 154.0,104.4 265.0,87.4 355.6,154.0 372.6,265.0" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.20" stroke-opacity="0.66" />
              <polygon points="299.0,365.4 183.0,374.6 94.6,299.0 85.4,183.0 161.0,94.6 277.0,85.4 365.4,161.0 374.6,277.0" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.23" stroke-opacity="0.70" />
              <polygon points="290.9,374.9 170.6,375.5 85.1,290.9 84.5,170.6 169.1,85.1 289.4,84.5 374.9,169.1 375.5,289.4" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.25" stroke-opacity="0.74" />
              <polygon points="281.8,383.9 157.8,375.5 76.1,281.8 84.5,157.8 178.2,76.1 302.2,84.5 383.9,178.2 375.5,302.2" fill="none" stroke="url(#kineticFlywheelGrad)" stroke-width="1.27" stroke-opacity="0.78" />
            </g>
          </svg>

          <!-- Center Core Disc -->
          <div class="flywheel-center-core">
            <div class="flywheel-core-title">Distribution<br>Flywheel</div>
            <div class="flywheel-core-sub">AdmitLabs</div>
          </div>

          <!-- Desktop Floating Satellite Nodes -->
          <div class="desktop-only-nodes">
            <!-- 1. Top: LinkedIn Leadership -->
            <div class="flywheel-satellite-node node-pos-top">
              <div class="node-app-badge badge-linkedin">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.69a1.59 1.59 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6c0-.88-.72-1.6-1.6-1.6z"/></svg>
              </div>
              <div class="node-meta">
                <span class="node-platform-name">LinkedIn Leadership</span>
                <span class="node-format-role">Deans & Faculty</span>
              </div>
            </div>

            <!-- 2. Top-Right: Instagram Reels -->
            <div class="flywheel-satellite-node node-pos-top-right">
              <div class="node-app-badge badge-instagram">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </div>
              <div class="node-meta">
                <span class="node-platform-name">Vertical Cinema</span>
                <span class="node-format-role">Reels (9:16)</span>
              </div>
            </div>

            <!-- 3. Bottom-Right: Data Carousels -->
            <div class="flywheel-satellite-node node-pos-bottom-right">
              <div class="node-app-badge badge-linkedin">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <div class="node-meta">
                <span class="node-platform-name">Data Carousels</span>
                <span class="node-format-role">Placement Proof</span>
              </div>
            </div>

            <!-- 4. Bottom: Admissions Sprints -->
            <div class="flywheel-satellite-node node-pos-bottom">
              <div class="node-app-badge badge-instagram">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              </div>
              <div class="node-meta">
                <span class="node-platform-name">Admissions Sprints</span>
                <span class="node-format-role">Seat Conversion</span>
              </div>
            </div>

            <!-- 5. Bottom-Left: Student Case Studies -->
            <div class="flywheel-satellite-node node-pos-bottom-left">
              <div class="node-app-badge badge-youtube">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <div class="node-meta">
                <span class="node-platform-name">Student Trajectories</span>
                <span class="node-format-role">Alumni Proof</span>
              </div>
            </div>

            <!-- 6. Top-Left: YouTube Documentaries -->
            <div class="flywheel-satellite-node node-pos-top-left">
              <div class="node-app-badge badge-youtube">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <div class="node-meta">
                <span class="node-platform-name">Mini-Documentaries</span>
                <span class="node-format-role">Lab & Research</span>
              </div>
            </div>
          </div>

          <!-- Mobile-Only Satellite Grid -->
          <div class="mobile-satellite-grid">
            <div class="flywheel-satellite-node">
              <div class="node-app-badge badge-linkedin">in</div>
              <div class="node-meta"><span class="node-platform-name">LinkedIn Leadership</span><span class="node-format-role">Deans & Faculty</span></div>
            </div>
            <div class="flywheel-satellite-node">
              <div class="node-app-badge badge-instagram">IG</div>
              <div class="node-meta"><span class="node-platform-name">Vertical Cinema</span><span class="node-format-role">Reels (9:16)</span></div>
            </div>
            <div class="flywheel-satellite-node">
              <div class="node-app-badge badge-linkedin">in</div>
              <div class="node-meta"><span class="node-platform-name">Data Carousels</span><span class="node-format-role">Placement Proof</span></div>
            </div>
            <div class="flywheel-satellite-node">
              <div class="node-app-badge badge-instagram">IG</div>
              <div class="node-meta"><span class="node-platform-name">Admissions Sprints</span><span class="node-format-role">Seat Conversion</span></div>
            </div>
            <div class="flywheel-satellite-node">
              <div class="node-app-badge badge-youtube">YT</div>
              <div class="node-meta"><span class="node-platform-name">Student Stories</span><span class="node-format-role">Alumni Proof</span></div>
            </div>
            <div class="flywheel-satellite-node">
              <div class="node-app-badge badge-youtube">YT</div>
              <div class="node-meta"><span class="node-platform-name">Mini-Documentaries</span><span class="node-format-role">Lab Stories</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 04. SERVICES -->
<section class="services-section" id="services">
  <div class="wrap">
    <div class="services-header-block reveal-on-scroll">
      <h2>Three ways to work with AdmitLabs.</h2>
      <p class="lede">
        Fixed, repeatable media infrastructure built strictly for education institutions and academic leaders.
      </p>
    </div>

    <div class="services-grid-3col stagger-parent">
      <!-- 01: Leadership Branding -->
      <div class="svc-bespoke-card reveal-child">
        <div>
          <div class="svc-main-title">Leadership Branding</div>
          <p class="svc-lead-summary">
            Personal branding for an individual education leader. One monthly interview becomes a month of content.
          </p>
          <div class="svc-target-sub">
            For vice chancellors, deans, directors, founders, and star faculty.
          </div>

          <!-- Monthly Deliverable Matrix -->
          <div class="svc-output-matrix">
            <div class="svc-output-matrix-title">Monthly Deliverables</div>
            <div class="svc-output-row">
              <span>Interview Talking Head Reels</span>
              <span class="svc-output-pill">20x Reels</span>
            </div>
            <div class="svc-output-row">
              <span>Authority Slide Carousels</span>
              <span class="svc-output-pill">4x Carousels</span>
            </div>
            <div class="svc-output-row">
              <span>Executive Thought Leadership</span>
              <span class="svc-output-pill">4x LinkedIn Posts</span>
            </div>
            <div class="svc-output-row">
              <span>Monthly Content & Posting Plan</span>
              <span class="svc-output-pill">Included</span>
            </div>
          </div>

          <div class="svc-process-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>One 45-min monthly recorded interview. Assets delivered in 2 monthly batches.</span>
          </div>
        </div>

        <button class="btn-svc-action" onclick="openIntakeModal('Leadership Branding')">
          Explore Leadership Branding
        </button>
      </div>

      <!-- 02: Institutional Content System (Featured) -->
      <div class="svc-bespoke-card featured-tier reveal-child">
        <div>
          <div class="svc-main-title">Institutional Content System</div>
          <p class="svc-lead-summary">
            The institution's monthly content engine. Structured inputs in, finished content out.
          </p>
          <div class="svc-target-sub">
            For universities, autonomous colleges, coaching institutes, and premium schools.
          </div>

          <!-- Monthly Deliverable Matrix -->
          <div class="svc-output-matrix">
            <div class="svc-output-matrix-title">Monthly Deliverables</div>
            <div class="svc-output-row">
              <span>Campus Pedagogy & Outcome Reels</span>
              <span class="svc-output-pill">20x Reels</span>
            </div>
            <div class="svc-output-row">
              <span>Placement Proof Carousels</span>
              <span class="svc-output-pill">4x Carousels</span>
            </div>
            <div class="svc-output-row">
              <span>Institutional LinkedIn Presence</span>
              <span class="svc-output-pill">4x LinkedIn Posts</span>
            </div>
            <div class="svc-output-row">
              <span>Content Plan + Performance Report</span>
              <span class="svc-output-pill">Monthly</span>
            </div>
          </div>

          <div class="svc-process-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Structured monthly input form. Finished assets delivered ready to post in weekly batches.</span>
          </div>
        </div>

        <button class="btn-svc-action" onclick="openIntakeModal('Institutional Content System')">
          Explore Institutional Content System
        </button>
      </div>

      <!-- 03: AdmitCampaign -->
      <div class="svc-bespoke-card reveal-child">
        <div>
          <div class="svc-main-title">AdmitCampaign</div>
          <p class="svc-lead-summary">
            A 90-day demand sprint timed to an admission or batch cycle.
          </p>
          <div class="svc-target-sub">
            For institutions with defined intake windows and coaching brands with batch launches.
          </div>

          <!-- Sprint Total Quota Matrix -->
          <div class="svc-output-matrix">
            <div class="svc-output-matrix-title">90-Day Sprint Deliverables</div>
            <div class="svc-output-row">
              <span>Campaign Narrative & Messaging</span>
              <span class="svc-output-pill">Included</span>
            </div>
            <div class="svc-output-row">
              <span>Reels, Carousels & LinkedIn</span>
              <span class="svc-output-pill">Unlimited</span>
            </div>
            <div class="svc-output-row">
              <span>Ad Creative Sets (for Paid Spend)</span>
              <span class="svc-output-pill">20x Sets</span>
            </div>
            <div class="svc-output-row">
              <span>Landing Page Copy & Bi-Weekly Reviews</span>
              <span class="svc-output-pill">Included</span>
            </div>
          </div>

          <div class="svc-process-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Front-loaded production at intake kickoff with weekly delivery batches and end-of-campaign report.</span>
          </div>
        </div>

        <button class="btn-svc-action" onclick="openIntakeModal('AdmitCampaign')">
          Explore AdmitCampaign
        </button>
      </div>
    </div>
  </div>
</section>

<!-- 05. SELECTED WORK -->
<section class="work-section" id="work">
  <div class="wrap">
    <div class="work-header-center reveal-on-scroll">
      <h2>Work that earns attention.</h2>
      <p class="lede">
        A selection of stories, campaigns and content built exclusively for education.
      </p>
    </div>

    <div class="reels-grid-4col stagger-parent" id="workGallery">
      <!-- Reel 01 -->
      <div class="reel-card-item reveal-child" onclick="openIntakeModal('Campus Pedagogy Cinema')">
        <div class="reel-media-placeholder">
          <div class="reel-placeholder-pattern"></div>
          <div class="reel-viewfinder-brackets"></div>
          <div class="reel-meta-tag-watermark">4K UHD · 9:16 CINEMA</div>
        </div>
        <div class="reel-top-bar">
          <span class="reel-format-badge">9:16 Reel</span>
          <span class="reel-brand-tag">AdmitLabs</span>
        </div>
        <div class="reel-play-btn" aria-label="Play Reel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="reel-bottom-bar">
          <div class="reel-caption-pill">something no other institution had ever built</div>
          <div class="reel-title-label">Campus Pedagogy Cinema</div>
        </div>
      </div>

      <!-- Reel 02 -->
      <div class="reel-card-item reveal-child" onclick="openIntakeModal('Leadership Dialogue')">
        <div class="reel-media-placeholder">
          <div class="reel-placeholder-pattern"></div>
          <div class="reel-viewfinder-brackets"></div>
          <div class="reel-meta-tag-watermark">4K UHD · 9:16 CINEMA</div>
        </div>
        <div class="reel-top-bar">
          <span class="reel-format-badge">Leadership</span>
          <span class="reel-brand-tag">AdmitLabs</span>
        </div>
        <div class="reel-play-btn" aria-label="Play Reel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="reel-bottom-bar">
          <div class="reel-caption-pill">translating policy into national prominence</div>
          <div class="reel-title-label">Executive Leadership Voice</div>
        </div>
      </div>

      <!-- Reel 03 -->
      <div class="reel-card-item reveal-child" onclick="openIntakeModal('Faculty Research Breakthrough')">
        <div class="reel-media-placeholder">
          <div class="reel-placeholder-pattern"></div>
          <div class="reel-viewfinder-brackets"></div>
          <div class="reel-meta-tag-watermark">4K UHD · 9:16 CINEMA</div>
        </div>
        <div class="reel-top-bar">
          <span class="reel-format-badge">Research</span>
          <span class="reel-brand-tag">AdmitLabs</span>
        </div>
        <div class="reel-play-btn" aria-label="Play Reel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="reel-bottom-bar">
          <div class="reel-caption-pill">proven academic rigor and lab discoveries</div>
          <div class="reel-title-label">Faculty Research Showcase</div>
        </div>
      </div>

      <!-- Reel 04 -->
      <div class="reel-card-item reveal-child" onclick="openIntakeModal('Student Trajectory & Placements')">
        <div class="reel-media-placeholder">
          <div class="reel-placeholder-pattern"></div>
          <div class="reel-viewfinder-brackets"></div>
          <div class="reel-meta-tag-watermark">4K UHD · 9:16 CINEMA</div>
        </div>
        <div class="reel-top-bar">
          <span class="reel-format-badge">Placements</span>
          <span class="reel-brand-tag">AdmitLabs</span>
        </div>
        <div class="reel-play-btn" aria-label="Play Reel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="reel-bottom-bar">
          <div class="reel-caption-pill">verified alumni salaries and recruiter stories</div>
          <div class="reel-title-label">Student Outcome Trajectory</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 06. WHO WE WORK WITH -->
<section class="who-cards-section" id="who">
  <div class="wrap">
    <div class="who-header-center reveal-on-scroll">
      <h2>One industry. <em>Different ambitions.</em></h2>
      <p class="lede">
        Built exclusively for education. We partner with four core archetypes to build enduring authority and demand.
      </p>
    </div>

    <div class="who-cards-grid">
      <!-- Archetype 1: Universities & Colleges -->
      <div class="who-archetype-card reveal-child">
        <div>
          <div class="who-card-icon-badge badge-acc-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"/></svg>
          </div>
          <div class="who-card-title">Universities & Colleges</div>
          <div class="who-card-chip chip-blue">
            <span class="who-chip-dot"></span>
            <span>Institutional Authority</span>
          </div>
          <p class="who-card-body-p">
            Turn faculty research, academic excellence, and student outcomes into sustained national reputation and student demand.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Campus content engines and proof systems</span>
        </div>
      </div>

      <!-- Archetype 2: Education Leaders -->
      <div class="who-archetype-card reveal-child">
        <div>
          <div class="who-card-icon-badge badge-acc-gold">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m19 8 2 2-2 2"/><path d="m17 12 4-4"/></svg>
          </div>
          <div class="who-card-title">Education Leaders</div>
          <div class="who-card-chip chip-gold">
            <span class="who-chip-dot"></span>
            <span>Personal Authority</span>
          </div>
          <p class="who-card-body-p">
            Transform executive perspectives and academic vision into high-impact thought leadership and national prominence from 45 minutes a month.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Executive thought leadership from 45 min/month</span>
        </div>
      </div>

      <!-- Archetype 3: Education Brands -->
      <div class="who-archetype-card reveal-child">
        <div>
          <div class="who-card-icon-badge badge-acc-pink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div class="who-card-title">Education Brands</div>
          <div class="who-card-chip chip-pink">
            <span class="who-chip-dot"></span>
            <span>Conversion & Trust</span>
          </div>
          <p class="who-card-body-p">
            Build high-trust student proof, salary breakdowns, and recruiter stories that turn prospective learners into active enrollments.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Alumni outcome cinema and conversion carousels</span>
        </div>
      </div>

      <!-- Archetype 4: Coaching & Test Prep -->
      <div class="who-archetype-card reveal-child">
        <div>
          <div class="who-card-icon-badge badge-acc-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="12 6 15 11 20 11 16 14 18 19 12 16 6 19 8 14 4 11 9 11 12 6"/>
            </svg>
          </div>
          <div class="who-card-title">Coaching & Test Prep</div>
          <div class="who-card-chip chip-purple">
            <span class="who-chip-dot"></span>
            <span>Star Faculty & Batch Demand</span>
          </div>
          <p class="who-card-body-p">
            Built for high marketing spend and competitive batch cycles. Turn star faculty authority, ranker proof breakdowns, and teacher-led media into recurring enrollment peaks.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Star faculty branding and batch enrollment engines</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 07. HOW WE WORK (VISUAL STUDIO TEAM ORBIT) -->
<section class="time-section" id="process">
  <div class="time-grid-bg" aria-hidden="true"></div>
  <div class="wrap">
    <div class="how-stage-grid stagger-parent">
      <!-- Left Column: 3 Specialist Cards -->
      <div class="how-cards-col">
        <!-- 1. Strategists (instead of Lead Creatives) -->
        <div class="studio-team-card card-tilt-l1">
          <div class="team-card-icon-wrap">
            <!-- Lightbulb / Strategy Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
              <path d="M9 18h6M10 22h4"/>
            </svg>
          </div>
          <div class="team-card-info">
            <div class="team-card-role-title">Strategists</div>
            <div class="team-card-role-sub">Institutional narrative & positioning</div>
          </div>
        </div>

        <!-- 2. Content Writers -->
        <div class="studio-team-card card-tilt-l2">
          <div class="team-card-icon-wrap">
            <!-- Typewriter / Content Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2"/>
              <path d="M7 11V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/>
              <line x1="7" y1="15" x2="7" y2="15.01"/>
              <line x1="12" y1="15" x2="12" y2="15.01"/>
              <line x1="17" y1="15" x2="17" y2="15.01"/>
              <line x1="7" y1="18" x2="17" y2="18"/>
            </svg>
          </div>
          <div class="team-card-info">
            <div class="team-card-role-title">Content Writers</div>
            <div class="team-card-role-sub">Video scripting & thought leadership</div>
          </div>
        </div>

        <!-- 3. Designers -->
        <div class="studio-team-card card-tilt-l3">
          <div class="team-card-icon-wrap">
            <!-- Designer / Palette Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </div>
          <div class="team-card-info">
            <div class="team-card-role-title">Designers</div>
            <div class="team-card-role-sub">Conversion carousels & proof visuals</div>
          </div>
        </div>
      </div>

      <!-- Center Column: Core Proposition (Clean, No Annotations) -->
      <div class="how-center-focal">
        <h2 class="how-hub-title">
          45 minutes from you.<br>
          <span class="gold-highlight">Everything else from us.</span>
        </h2>

        <p class="how-hub-sub">
          We become your dedicated in-house media department that you never have to hire or manage. Every specialist focuses on creating the media output.
        </p>

        <!-- Redesigned Advantage Capsule -->
        <div class="how-advantage-capsule">
          <span class="adv-side-you">You bring expertise.</span>
          <span class="adv-arrow-sym">→</span>
          <span class="adv-side-admit">We build the media advantage.</span>
        </div>
      </div>

      <!-- Right Column: 3 Specialist Cards -->
      <div class="how-cards-col">
        <!-- 4. World-class Editors -->
        <div class="studio-team-card card-tilt-r1">
          <div class="team-card-icon-wrap">
            <!-- Film Reel / Video Editor Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M7 4v16M17 4v16M2 12h20M2 8h5M2 16h5M17 8h5M17 16h5"/>
            </svg>
          </div>
          <div class="team-card-info">
            <div class="team-card-role-title">World-class Editors</div>
            <div class="team-card-role-sub">4K vertical short-form cinema</div>
          </div>
        </div>

        <!-- 5. Project Managers -->
        <div class="studio-team-card card-tilt-r2">
          <div class="team-card-icon-wrap">
            <!-- Project Manager Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="team-card-info">
            <div class="team-card-role-title">Project Managers</div>
            <div class="team-card-role-sub">Intake deadlines & production pipelines</div>
          </div>
        </div>

        <!-- 6. Virtual Assistants & Distribution -->
        <div class="studio-team-card card-tilt-r3">
          <div class="team-card-icon-wrap">
            <!-- Headset / Virtual Assistant Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              <path d="M8 21v-4a4 4 0 0 1 4-4h0"/>
            </svg>
          </div>
          <div class="team-card-info">
            <div class="team-card-role-title">Virtual Assistants</div>
            <div class="team-card-role-sub">Omnichannel publishing & scheduling</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 08. FINAL CTA -->
<section class="cta-section" id="apply">
  <div class="wrap">
    <div class="cta-box reveal-on-scroll">
      <h2>Ready to build a media advantage?</h2>
      <p class="lede">
        Tell us what you're building. We'll see if we're the right team to help.
      </p>

      <div class="cta-actions-row">
        <button class="btn btn-primary" onclick="openIntakeModal()">
          Start a conversation
        </button>
        <a href="mailto:hello@admitlabs.in" class="btn btn-ghost">
          hello@admitlabs.in
        </a>
      </div>
    </div>
  </div>
</section>

<!-- 09. FAQ -->
<section class="faq-section" id="faq">
  <div class="wrap">
    <h2>Before we start.</h2>

    <div class="faq-accordion reveal-on-scroll">
      <details class="faq-item" open>
        <summary class="faq-question">
          <span>What exactly does AdmitLabs do?</span>
          <span class="faq-icon">+</span>
        </summary>
        <div class="faq-answer">
          We build the content and media infrastructure that makes education institutions and leaders visible, credible, and in demand. We handle everything from narrative strategy and video production to design and omnichannel distribution.
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>Who do you work with?</span>
          <span class="faq-icon">+</span>
        </summary>
        <div class="faq-answer">
          We work exclusively with universities, colleges, chancellors, deans, K-12 schools, and progressive education and skilling brands looking to build enduring authority.
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>How much time do you need from our team?</span>
          <span class="faq-icon">+</span>
        </summary>
        <div class="faq-answer">
          Just 45 minutes a month from key leaders for our monthly strategic interview. Our team absorbs all other production, editing, design, and distribution friction.
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>Do you guarantee admissions or leads?</span>
          <span class="faq-icon">+</span>
        </summary>
        <div class="faq-answer">
          Admissions depend on academic quality, fee structures, and internal counseling. What we guarantee is the media engine that feeds high-intent decisions: content delivered on schedule, produced to a world-class standard, argued strictly from evidence you can substantiate.
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>Can you work with our internal marketing team?</span>
          <span class="faq-icon">+</span>
        </summary>
        <div class="faq-answer">
          Yes. We frequently partner with internal admissions and communications teams, acting as their specialized high-end creative and video production engine.
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>How do we get started?</span>
          <span class="faq-icon">+</span>
        </summary>
        <div class="faq-answer">
          Click "Start a conversation" to submit an inquiry. We will review your institution's current media footprint and schedule an exploratory strategy dialogue within 24 hours.
        </div>
      </details>
    </div>
  </div>
</section>

<!-- 10. FOOTER WITH FLUID SMOKE CANVAS BEDROCK -->
<footer>
  <div class="wrap">
    <div class="footer-top-grid">
      <div>
        <div class="footer-tagline-text">
          Education, made impossible to ignore.
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
        <ul class="footer-nav-list">
          <li><a href="#approach">Process</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#work">Work</a></li>
          <li><a href="#who">Clients</a></li>
          <li><a href="#process">How It Works</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="javascript:openIntakeModal()">Contact</a></li>
        </ul>
        <a href="mailto:hello@admitlabs.in" class="footer-email-link">hello@admitlabs.in</a>
      </div>
    </div>
  </div>

  <!-- Monumental AdmitLabs Brand Logo with Fluid Smoke Bedrock -->
  <div class="footer-smoke-monument">
    <canvas id="smokeCanvas" class="smoke-canvas-layer"></canvas>
    <div class="monumental-brand-logo"><b>Admit</b><span>Labs</span></div>
  </div>

  <div class="footer-bottom-bar">
    <div class="footer-copy-text">
      © 2026 AdmitLabs. A Kerf Education company.
    </div>
    <div class="footer-copy-text">
      Built exclusively for education institutions and academic leaders.
    </div>
  </div>
</footer>

<!-- MODALS -->
<div class="modal-overlay" id="intakeModal" onclick="closeModalOnOverlay(event)">
  <div class="modal-box">
    <button class="modal-close-btn" onclick="closeIntakeModal()" aria-label="Close modal">×</button>
    <h3 style="margin-bottom: 8px;">Work with AdmitLabs</h3>
    <p class="body-copy">Tell us what you're building. We'll see if we're the right team to help.</p>

    <form class="modal-form" onsubmit="handleFormSubmit(event)">
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" placeholder="Dr. Sarah Jenkins" required>
      </div>

      <div class="form-group">
        <label>Institution / Brand Name</label>
        <input type="text" placeholder="Apex Institute of Technology" required>
      </div>

      <div class="form-group">
        <label>Official Email</label>
        <input type="email" placeholder="sarah@apex.edu" required>
      </div>

      <div class="form-group">
        <label>Way to Work Together</label>
        <select id="modalServiceSelect">
          <option value="Leadership Branding">Leadership Branding (Personal Authority)</option>
          <option value="Institutional Content System" selected>Institutional Content System (Always-On Engine)</option>
          <option value="AdmitCampaign">AdmitCampaign (Admissions Sprint)</option>
          <option value="Custom">Custom Educational Engagement</option>
        </select>
      </div>

      <div class="form-group">
        <label>Key Goals & Context</label>
        <textarea rows="3" placeholder="Describe your upcoming admissions cycle or thought leadership ambitions..."></textarea>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
        Submit Inquiry
      </button>
    </form>
  </div>
</div>
`;

const clientJs = `
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#' || !href) return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Mobile Menu Toggle
  const menuToggle = document.getElementById('menuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mobileDrawer.classList.toggle('open');
      document.body.style.overflow = mobileDrawer.classList.contains('open') ? 'hidden' : '';
    });
  }

  function closeMobileMenu() {
    if (menuToggle && mobileDrawer) {
      menuToggle.classList.remove('active');
      mobileDrawer.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Modals
  function openIntakeModal(serviceName) {
    const modal = document.getElementById('intakeModal');
    if (modal) {
      modal.classList.add('active');
      if (serviceName) {
        const select = document.getElementById('modalServiceSelect');
        if (select) {
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === serviceName || select.options[i].text.includes(serviceName)) {
              select.selectedIndex = i;
              break;
            }
          }
        }
      }
    }
  }

  function closeIntakeModal() {
    const modal = document.getElementById('intakeModal');
    if (modal) modal.classList.remove('active');
  }

  function closeModalOnOverlay(e) {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    alert('Thank you for reaching out to AdmitLabs. Our admissions strategy team will contact you within 24 hours.');
    closeIntakeModal();
  }

  // Scroll Nav bar
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) {
      if (window.scrollY > 40) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  // IntersectionObserver Scroll Reveal Animations
  (function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal-on-scroll, .stagger-parent').forEach(el => el.classList.add('is-revealed'));
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll, .stagger-parent').forEach(el => {
      revealObserver.observe(el);
    });
  })();

  // CINEMATIC FLUID SMOKE CANVAS INITIALIZATION (Gold & Ivory Whisps on Pure Black)
  (function initFluidSmokeCanvas() {
    const canvas = document.getElementById('smokeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width, height;
    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const numParticles = 48;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * (width || 800),
        y: (height || 260) * 0.4 + Math.random() * ((height || 260) * 0.6),
        radius: 40 + Math.random() * 85,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.15 - Math.random() * 0.45,
        baseAlpha: 0.04 + Math.random() * 0.12,
        alpha: 0.05,
        life: Math.random() * 100,
        maxLife: 80 + Math.random() * 100,
        color: Math.random() > 0.4 ? 'rgba(240, 199, 94,' : 'rgba(244, 235, 217,'
      });
    }

    function animateSmoke() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        if (progress < 0.3) {
          p.alpha = (progress / 0.3) * p.baseAlpha;
        } else {
          p.alpha = (1 - (progress - 0.3) / 0.7) * p.baseAlpha;
        }

        if (p.life >= p.maxLife || p.y < -p.radius || p.x < -p.radius || p.x > width + p.radius) {
          p.life = 0;
          p.x = Math.random() * width;
          p.y = height * 0.75 + Math.random() * (height * 0.3);
          p.radius = 45 + Math.random() * 90;
          p.vx = (Math.random() - 0.5) * 0.45;
          p.vy = -0.15 - Math.random() * 0.45;
        }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, p.color + p.alpha + ')');
        grad.addColorStop(0.5, p.color + (p.alpha * 0.5) + ')');
        grad.addColorStop(1, p.color + '0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(animateSmoke);
    }
    animateSmoke();
  })();
`;

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AdmitLabs | Education Branding & Media</title>
<meta name="description" content="We turn your institution's outcomes, expertise and people into content that earns attention, builds trust and creates demand.">
<link rel="icon" type="image/png" href="data:image/png;base64,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">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..900&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${bodyHtml}
<script>
${clientJs}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), fullHtml, 'utf8');
fs.writeFileSync(path.join(__dirname, 'admitlabs-website-mockup.html'), fullHtml, 'utf8');
console.log('Successfully written complete files.');
