const fs = require('fs');

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
    
    --pad: clamp(20px, 5.5vw, 96px);
    --pad-y: clamp(40px, 5vw, 68px);
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
    -webkit-text-size-adjust: 100%;
    background-color: var(--black);
    color: var(--ivory);
    overflow-x: hidden;
    max-width: 100vw;
    width: 100%;
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

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 18;
    font-size: 14px;
    letter-spacing: -0.015em;
    text-transform: none;
    padding: 14px 28px;
    border-radius: var(--radius-sm);
    text-decoration: none;
    cursor: pointer;
    border: none;
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
  .btn svg {
    transition: transform var(--transition-fast);
  }
  .btn:hover svg {
    transform: translateX(4px);
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
    font-size: clamp(22px, 2vw, 25px);
    letter-spacing: -0.035em;
    text-decoration: none;
    color: var(--ivory);
    display: inline-flex;
    align-items: baseline;
  }
  .brand-mark b { font-variation-settings: 'wght' 800, 'opsz' 40; letter-spacing: -0.04em; }
  .brand-mark span { font-variation-settings: 'wght' 300, 'opsz' 40; color: var(--ivory-dim); }

  .nav-links { display: none; list-style: none; align-items: center; gap: clamp(16px, 1.8vw, 32px); }
  @media (min-width: 920px) { .nav-links { display: flex; } }
  .nav-link {
    color: var(--slate-light);
    text-decoration: none;
    font-size: 13.5px;
    font-variation-settings: 'wght' 500;
    letter-spacing: 0.02em;
    transition: color var(--transition-fast);
    position: relative;
    white-space: nowrap;
  }
  .nav-link:hover { color: var(--ivory); }
  .nav-link::after {
    content: ""; position: absolute; bottom: -4px; left: 0; width: 0%; height: 1px;
    background: var(--gold); transition: width var(--transition-fast);
  }
  .nav-link:hover::after { width: 100%; }
  .nav-right { display: flex; align-items: center; gap: 14px; }
  .nav-cta-btn { padding: 9px 18px; font-size: 12px; white-space: nowrap; }

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
    position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
    background: var(--black); z-index: 990;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 100px var(--pad) 40px; transform: translateY(-100%);
    transition: transform var(--transition-smooth);
  }
  .mobile-drawer.open { transform: translateY(0); }
  .mobile-nav-links { list-style: none; display: flex; flex-direction: column; gap: 24px; }
  .mobile-nav-links a {
    font-size: clamp(20px, 4.5vw, 28px);
    font-variation-settings: 'wght' 700, 'opsz' 36;
    letter-spacing: -0.02em;
    text-decoration: none;
    color: var(--ivory);
  }
  .mobile-drawer-footer { border-top: 1px solid var(--graphite-border); padding-top: 24px; }

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
    font-variation-settings: 'wght' 800, 'opsz' 72;
    font-size: clamp(30px, 4.0vw, 52px);
    line-height: 1.0;
    letter-spacing: -0.035em;
    color: var(--ivory);
    margin-bottom: 16px;
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
  }
  .services-header-block {
    max-width: 800px;
    margin-bottom: clamp(36px, 5vw, 60px);
  }
  .services-header-block h2 {
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
    font-size: 14px;
    letter-spacing: -0.015em;
    text-transform: none;
    color: var(--gold);
  }
  .svc-cadence-pill {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 600, 'opsz' 16;
    font-size: 12px;
    letter-spacing: -0.01em;
    text-transform: none;
    padding: 4px 10px;
    background: rgba(244, 235, 217, 0.06);
    border: 1px solid rgba(244, 235, 217, 0.14);
    border-radius: var(--radius-sm);
    color: var(--ivory-dim);
  }

  .svc-main-title {
    font-variation-settings: 'wght' 800, 'opsz' 48;
    font-size: clamp(24px, 2.5vw, 32px);
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--ivory);
    margin-bottom: 12px;
  }
  .svc-lead-summary {
    font-size: 14px;
    color: var(--slate-light);
    line-height: 1.55;
    margin-bottom: 16px;
  }
  .svc-target-sub {
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
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .svc-output-matrix-title {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 600, 'opsz' 16;
    font-size: 12px;
    letter-spacing: -0.01em;
    text-transform: none;
    color: var(--slate);
    margin-bottom: 6px;
  }
  .svc-output-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12.5px;
    color: var(--ivory-dim);
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
  }

  .btn-svc-action {
    width: 100%;
    padding: 13px 20px;
    font-family: var(--font-main);
    font-variation-settings: 'wght' 700, 'opsz' 20;
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

  /* 07. How We Work (45 Minutes) */
  .time-section {
    background: var(--ivory);
    color: var(--ink);
    padding: clamp(64px, 8vw, 110px) var(--pad);
  }
  .time-header-block {
    max-width: 800px;
    margin-bottom: clamp(36px, 5vw, 56px);
  }
  .huge-time-num {
    font-variation-settings: 'wght' 800, 'opsz' 84;
    font-size: clamp(34px, 5.2vw, 68px);
    line-height: 0.95;
    letter-spacing: -0.04em;
    color: var(--ink);
    margin-bottom: 12px;
  }
  .time-header-block .lede {
    color: var(--ink-dim);
  }

  .how-work-grid-2col {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  @media (min-width: 860px) {
    .how-work-grid-2col {
      grid-template-columns: 1fr 1.6fr;
    }
  }
  .how-box-you {
    background: #E5DCC9;
    border: 1px solid rgba(18, 19, 22, 0.12);
    border-radius: var(--radius-sm);
    padding: clamp(24px, 3vw, 36px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .how-box-admit {
    background: var(--ink);
    color: var(--ivory);
    border-radius: var(--radius-sm);
    padding: clamp(24px, 3vw, 36px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .how-party-title {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 800, 'opsz' 24;
    font-size: 16px;
    letter-spacing: -0.02em;
    text-transform: none;
    margin-bottom: 12px;
  }
  .how-box-you .how-party-title { color: var(--ink-dim); }
  .how-box-admit .how-party-title { color: var(--gold); }

  .how-party-headline {
    font-variation-settings: 'wght' 800, 'opsz' 40;
    font-size: clamp(20px, 2.2vw, 28px);
    letter-spacing: -0.02em;
    margin-bottom: 16px;
    line-height: 1.15;
  }
  .how-party-tags {
    font-family: var(--font-main);
    font-variation-settings: 'wght' 500, 'opsz' 18;
    font-size: 14px;
    letter-spacing: -0.01em;
    line-height: 1.6;
  }
  .how-box-you .how-party-tags { color: var(--ink); font-weight: 600; }
  .how-box-admit .how-party-tags { color: var(--ivory); }

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
    gap: 16px;
    margin-top: clamp(28px, 3.5vw, 40px);
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
    font-size: clamp(64px, 17.5vw, 240px);
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
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
    <div class="hero-center-wrap">
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
  <div class="wrap proof-grid">
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
<section class="approach-section" id="approach">
  <div class="wrap">
    <div class="approach-split-grid">
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
    <div class="services-header-block">
      <h2>Three ways to work with AdmitLabs.</h2>
      <p class="lede">
        Fixed, repeatable media infrastructure built strictly for education institutions and academic leaders.
      </p>
    </div>

    <div class="services-grid-3col">
      <!-- 01: LeaderBrand -->
      <div class="svc-bespoke-card">
        <div>
          <div class="svc-card-header">
            <span class="svc-tag-mono">01 / LeaderBrand</span>
            <span class="svc-cadence-pill">Personal Authority</span>
          </div>

          <div class="svc-main-title">LeaderBrand</div>
          <p class="svc-lead-summary">
            Build authority around the people leading education.
          </p>
          <div class="svc-target-sub">
            For founders, chancellors, vice chancellors, deans and education leaders.
          </div>

          <!-- Media Matrix Output Box -->
          <div class="svc-output-matrix">
            <div class="svc-output-matrix-title">Monthly Deliverable Quota</div>
            <div class="svc-output-row">
              <span>Vertical Cinema (9:16)</span>
              <span class="svc-output-pill">4x Reels</span>
            </div>
            <div class="svc-output-row">
              <span>Deep-Dive Carousels (4:5)</span>
              <span class="svc-output-pill">4x Carousels</span>
            </div>
            <div class="svc-output-row">
              <span>Thought Leadership (LinkedIn)</span>
              <span class="svc-output-pill">8x Essays</span>
            </div>
          </div>
        </div>

        <button class="btn-svc-action" onclick="openIntakeModal('LeaderBrand')">
          Explore LeaderBrand
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <!-- 02: StoryEngine (Featured) -->
      <div class="svc-bespoke-card featured-tier">
        <div>
          <div class="svc-card-header">
            <span class="svc-tag-mono">02 / StoryEngine</span>
            <span class="svc-cadence-pill" style="background: rgba(240, 199, 94, 0.2); color: var(--gold); border-color: var(--gold);">Always-On Engine</span>
          </div>

          <div class="svc-main-title">StoryEngine</div>
          <p class="svc-lead-summary">
            Your institution's always-on content system.
          </p>
          <div class="svc-target-sub">
            We turn your outcomes, expertise and stories into a consistent media presence.
          </div>

          <!-- Media Matrix Output Box -->
          <div class="svc-output-matrix">
            <div class="svc-output-matrix-title">Monthly Deliverable Quota</div>
            <div class="svc-output-row">
              <span>Campus Pedagogy Cinema (9:16)</span>
              <span class="svc-output-pill">12x Reels</span>
            </div>
            <div class="svc-output-row">
              <span>Placement Proof Carousels</span>
              <span class="svc-output-pill">8x Carousels</span>
            </div>
            <div class="svc-output-row">
              <span>Multi-Channel Distribution</span>
              <span class="svc-output-pill">Omnichannel</span>
            </div>
          </div>
        </div>

        <button class="btn-svc-action" onclick="openIntakeModal('StoryEngine')">
          Explore StoryEngine
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <!-- 03: AdmitCampaign -->
      <div class="svc-bespoke-card">
        <div>
          <div class="svc-card-header">
            <span class="svc-tag-mono">03 / AdmitCampaign</span>
            <span class="svc-cadence-pill">Admissions Sprint</span>
          </div>

          <div class="svc-main-title">AdmitCampaign</div>
          <p class="svc-lead-summary">
            Focused campaigns for moments that matter.
          </p>
          <div class="svc-target-sub">
            Built around admissions, launches, new programs and major announcements.
          </div>

          <!-- Media Matrix Output Box -->
          <div class="svc-output-matrix">
            <div class="svc-output-matrix-title">Sprint Total Quota</div>
            <div class="svc-output-row">
              <span>High-Paced 4K Cinema Reels</span>
              <span class="svc-output-pill">20x Reels</span>
            </div>
            <div class="svc-output-row">
              <span>Admissions Conversion Carousels</span>
              <span class="svc-output-pill">15x Carousels</span>
            </div>
            <div class="svc-output-row">
              <span>Ad Creative Sets & Trailers</span>
              <span class="svc-output-pill">6x Sets</span>
            </div>
          </div>
        </div>

        <button class="btn-svc-action" onclick="openIntakeModal('AdmitCampaign')">
          Explore AdmitCampaign
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>
</section>

<!-- 05. SELECTED WORK -->
<section class="work-section" id="work">
  <div class="wrap">
    <div class="work-header-center">
      <h2>Work that earns attention.</h2>
      <p class="lede">
        A selection of stories, campaigns and content built exclusively for education.
      </p>
    </div>

    <div class="reels-grid-4col" id="workGallery">
      <!-- Reel 01 -->
      <div class="reel-card-item" onclick="openIntakeModal('Campus Pedagogy Cinema')">
        <div class="reel-media-placeholder">
          <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=720&auto=format&fit=crop" alt="Campus Pedagogy Cinema">
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
      <div class="reel-card-item" onclick="openIntakeModal('Leadership Dialogue')">
        <div class="reel-media-placeholder">
          <img src="https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=720&auto=format&fit=crop" alt="Dean Thought Leadership">
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
      <div class="reel-card-item" onclick="openIntakeModal('Faculty Research Breakthrough')">
        <div class="reel-media-placeholder">
          <img src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=720&auto=format&fit=crop" alt="Faculty Research Breakthrough">
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
      <div class="reel-card-item" onclick="openIntakeModal('Student Trajectory & Placements')">
        <div class="reel-media-placeholder">
          <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=720&auto=format&fit=crop" alt="Student Trajectory & Placements">
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
    <div class="who-header-center">
      <h2>One industry. <em>Different ambitions.</em></h2>
      <p class="lede">
        Built exclusively for education. We partner with four core archetypes to build enduring authority and demand.
      </p>
    </div>

    <div class="who-cards-grid">
      <!-- Archetype 1: Universities & Colleges -->
      <div class="who-archetype-card">
        <div>
          <div class="who-card-icon-badge badge-acc-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"/></svg>
          </div>
          <div class="who-card-title">Universities & Colleges</div>
          <div class="who-card-ambition-pill">Build a stronger institutional presence.</div>
          <p class="who-card-body-p">
            Convert groundbreaking faculty research, advanced labs, and verified placement spreadsheets into uncontested national admissions demand.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Sovereign campus content engines & proof systems</span>
        </div>
      </div>

      <!-- Archetype 2: Education Leaders -->
      <div class="who-archetype-card">
        <div>
          <div class="who-card-icon-badge badge-acc-gold">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m19 8 2 2-2 2"/><path d="m17 12 4-4"/></svg>
          </div>
          <div class="who-card-title">Education Leaders</div>
          <div class="who-card-ambition-pill">Turn expertise into authority.</div>
          <p class="who-card-body-p">
            Turn executive dialogues and policy perspectives into authoritative LinkedIn essays, masterclasses, and national prominence.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Executive thought leadership from 45 min/month</span>
        </div>
      </div>

      <!-- Archetype 3: Education Brands -->
      <div class="who-archetype-card">
        <div>
          <div class="who-card-icon-badge badge-acc-pink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div class="who-card-title">Education Brands</div>
          <div class="who-card-ambition-pill">Build stories people remember.</div>
          <p class="who-card-body-p">
            Dismantle learner skepticism with verified student trajectories, salary proof breakdowns, and recruiter dialogues that convert learners.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>High-trust alumni cinema & conversion carousels</span>
        </div>
      </div>

      <!-- Archetype 4: Schools & New-Age Education -->
      <div class="who-archetype-card">
        <div>
          <div class="who-card-icon-badge badge-acc-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <div class="who-card-title">Schools & New-Age Education</div>
          <div class="who-card-ambition-pill">Create a modern media presence.</div>
          <p class="who-card-body-p">
            High-trust classroom pedagogy cinema and student development stories that communicate daily excellence directly to discerning parents.
          </p>
        </div>
        <div class="who-card-foot-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Pedagogy cinema & early admissions pipelines</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 07. HOW WE WORK (45 MINUTES) -->
<section class="time-section" id="process">
  <div class="wrap">
    <div class="time-header-block">
      <div class="huge-time-num">45 minutes from you. Everything else from us.</div>
      <p class="lede">
        You bring the expertise. We handle what turns it into content.
      </p>
    </div>

    <div class="how-work-grid-2col">
      <!-- You Box -->
      <div class="how-box-you">
        <div>
          <div class="how-party-title">YOU</div>
          <div class="how-party-headline">45 minutes a month.</div>
        </div>
        <div class="how-party-tags">
          Ideas · Updates · Expertise · Context
        </div>
      </div>

      <!-- AdmitLabs Box -->
      <div class="how-box-admit">
        <div>
          <div class="how-party-title">ADMITLABS</div>
          <div class="how-party-headline">Complete Studio & Distribution Engine.</div>
        </div>
        <div class="how-party-tags">
          Strategy · Research · Scripting · Production · Editing · Design · Publishing
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 08. FINAL CTA -->
<section class="cta-section" id="apply">
  <div class="wrap">
    <div class="cta-box">
      <h2>Ready to build a media advantage?</h2>
      <p class="lede">
        Tell us what you're building. We'll see if we're the right team to help.
      </p>

      <div class="cta-actions-row">
        <button class="btn btn-primary" onclick="openIntakeModal()">
          Start a conversation
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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

    <div class="faq-accordion">
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
          <option value="LeaderBrand">LeaderBrand (Personal Authority)</option>
          <option value="StoryEngine" selected>StoryEngine (Always-On System)</option>
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
  });

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

fs.writeFileSync('c:/Users/busin/Desktop/admit/build.js', completeBuildJs, 'utf8');
fs.writeFileSync('c:/Users/busin/Desktop/admit/index.html', fullHtml, 'utf8');
fs.writeFileSync('c:/Users/busin/Desktop/admit/admitlabs-website-mockup.html', fullHtml, 'utf8');
console.log('Successfully restored complete master website files.');
