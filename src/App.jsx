import { useState, useRef, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, Minus, X } from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS & DATA
   ───────────────────────────────────────────── */
const SLIDE_DURATION = 5000;

const ui = {
  RU: { addToCart: 'В корзину', currency: 'сум', inCart: 'шт в корзине', cart: 'Корзина', total: 'Итого', clear: 'Очистить заказ', menu: 'МЕНЮ' },
  UZ: { addToCart: 'Savatga', currency: 'so\'m', inCart: 'dona savatda', cart: 'Savat', total: 'Jami', clear: 'Buyurtmani tozalash', menu: 'MENYU' },
};

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */
function formatPrice(p) { return p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
function dishId(catKey, idx) { return `${catKey}::${idx}`; }

/* ─────────────────────────────────────────────
   ANIMATED PRICE HOOK
   ───────────────────────────────────────────── */
function useAnimatedPrice(target, duration = 400) {
  const [display, setDisplay] = useState(target || 0);
  const prev = useRef(target || 0);
  const raf = useRef(null);

  useEffect(() => {
    if (target === undefined) return;
    const from = prev.current;
    const to = target;
    prev.current = target;
    if (from === to) { setDisplay(to); return; }

    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return display;
}

/* ─────────────────────────────────────────────
   LOADING OVERLAY COMPONENT
   ───────────────────────────────────────────── */
function LoadingScreen({ active, progress }) {
  return (
    <div className={`fixed inset-0 z-[200] bg-[#111] flex flex-col items-center justify-center transition-opacity duration-500 pointer-events-none ${active ? 'opacity-100' : 'opacity-0'}`}>
      <h1 className="text-4xl sm:text-5xl font-serif font-semibold tracking-widest text-white mb-6 animate-pulse text-shadow">
        Cofa Lova
      </h1>
      <div className="w-48 h-[3px] bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-lime-accent transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INTRO SCREEN COMPONENT
   ───────────────────────────────────────────── */
function IntroScreen({ lang, setLang, onMenuClick }) {
  return (
    <div className="absolute inset-0 z-[50] flex flex-col bg-black">
      <video
        autoPlay loop muted playsInline
        poster="/cafe_intro_bg.png"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        src="/intro.mp4" 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wider text-white text-shadow italic">
          Cofa Lova
        </h1>
        <div className="glass flex items-center p-0.5 rounded-full">
          <button onClick={() => setLang('RU')} className={`px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-300 cursor-pointer ${lang === 'RU' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}`}>RU</button>
          <button onClick={() => setLang('UZ')} className={`px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-300 cursor-pointer ${lang === 'UZ' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}`}>UZ</button>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col justify-end items-center pb-12">
        <button 
          onClick={onMenuClick}
          className="bg-black/50 backdrop-blur-md border border-white/20 text-white font-semibold tracking-[0.15em] uppercase text-[15px] px-12 py-3.5 rounded-full hover:bg-white/20 active:scale-95 transition-all duration-300 cursor-pointer"
        >
          {ui[lang].menu}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function App() {
  const [menuData, setMenuData] = useState(null);
  const [view, setView] = useState(() => window.location.pathname === '/menu' ? 'menu' : 'intro');
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const [lang, setLang] = useState('RU');
  const [activeCategory, setActiveCategory] = useState(null);
  const [currentDishIndex, setCurrentDishIndex] = useState(0);
  const [contentKey, setContentKey] = useState(0);

  /* Cart state */
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);

  /* Carousel progress */
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  /* Animations */
  const [flyAnim, setFlyAnim] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [cartBounce, setCartBounce] = useState(false);
  const [priceFlash, setPriceFlash] = useState(false);
  const cartBtnRef = useRef(null);
  const ctaBtnRef = useRef(null);
  const navRef = useRef(null);

  /* ── Fetch Data ── */
  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        setMenuData(data);
        const cats = Object.keys(data);
        if (cats.length > 0) setActiveCategory(cats[0]);
      })
      .catch(err => console.error("Failed to fetch menu:", err));
  }, []);

  const categoryKeys = menuData ? Object.keys(menuData) : [];
  const currentData = menuData && activeCategory ? menuData[activeCategory] : null;
  const currentDish = currentData?.dishes[currentDishIndex];
  const currentId = activeCategory ? dishId(activeCategory, currentDishIndex) : null;
  const currentInCart = currentId ? cart[currentId] : null;

  /* Derived cart data */
  const cartTotalCount = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  const cartTotalPrice = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);

  /* Animated price */
  const animatedPrice = useAnimatedPrice(currentDish?.price || 0);

  /* Localised getters */
  const catName = (k) => lang === 'UZ' ? (menuData[k]?.nameUz || k) : k;
  const dName = (d) => lang === 'UZ' ? (d?.nameUz || d?.name) : d?.name;
  const dDesc = (d) => lang === 'UZ' ? (d?.descriptionUz || d?.description) : d?.description;

  /* ── Listen to browser back/forward buttons ── */
  useEffect(() => {
    const handlePopState = () => {
      setView(window.location.pathname === '/menu' ? 'menu' : 'intro');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /* ── Preload images with Real Progress ── */
  useEffect(() => {
    if (!menuData) return; // Wait until data is fetched

    let loaded = 0;
    const total = categoryKeys.length;
    if (total === 0) {
      setIsLoading(false);
      return;
    }

    categoryKeys.forEach((c) => {
      const img = new Image();
      const onLoadOrError = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / total) * 100));
        if (loaded === total) {
          setTimeout(() => setIsLoading(false), 500);
        }
      };
      img.onload = onLoadOrError;
      img.onerror = onLoadOrError;
      img.src = menuData[c].image;
    });
  }, [menuData]); // Re-run when data is fetched

  /* ── Auto-advance carousel (only when in menu) ── */
  useEffect(() => {
    if (view !== 'menu' || isLoading || !currentData || currentData.dishes.length === 0) return;
    
    startTimeRef.current = Date.now();
    setProgress(0);
    const tick = () => {
      const p = Math.min((Date.now() - startTimeRef.current) / SLIDE_DURATION, 1);
      setProgress(p);
      if (p >= 1) {
        goToDish(currentDishIndex < currentData.dishes.length - 1 ? currentDishIndex + 1 : 0);
        return;
      }
      progressRef.current = requestAnimationFrame(tick);
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(progressRef.current);
  }, [activeCategory, currentDishIndex, contentKey, view, isLoading, currentData]);

  /* ── Enter Menu ── */
  const handleEnterMenu = () => {
    setIsLoading(true);
    setLoadProgress(0);
    setTimeout(() => setLoadProgress(40), 100);
    setTimeout(() => setLoadProgress(80), 300);
    setTimeout(() => setLoadProgress(100), 500);

    window.history.pushState({}, '', '/menu');
    setTimeout(() => {
      setView('menu');
      setIsLoading(false);
    }, 800);
  };

  /* ── Navigate dish ── */
  const goToDish = useCallback((idx) => {
    setCurrentDishIndex(idx);
    setContentKey((k) => k + 1);
    setPriceFlash(true);
    setTimeout(() => setPriceFlash(false), 350);
  }, []);

  /* ── Switch category (INSTANT) ── */
  const handleCategoryChange = useCallback((cat) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
    setCurrentDishIndex(0);
    setContentKey((k) => k + 1);
    setPriceFlash(true);
    setTimeout(() => setPriceFlash(false), 350);
  }, [activeCategory]);

  /* ── Scroll nav ── */
  useEffect(() => {
    if (!navRef.current) return;
    const el = navRef.current.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory, view]);

  /* ── Swipe ── */
  const [touchStart, setTouchStart] = useState(null);
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null || !currentData) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && currentDishIndex < currentData.dishes.length - 1) goToDish(currentDishIndex + 1);
      else if (diff < 0 && currentDishIndex > 0) goToDish(currentDishIndex - 1);
    }
    setTouchStart(null);
  };

  /* ── Spawn confetti ── */
  const spawnConfetti = useCallback((el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dots = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      x: cx, y: cy,
      dx: (Math.random() - 0.5) * 160,
      dy: (Math.random() - 0.5) * 160 - 30,
      color: ['#c4f042', '#4ade80', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa'][i % 6],
      size: Math.random() * 5 + 3,
    }));
    setConfetti(dots);
    setTimeout(() => setConfetti([]), 750);
  }, []);

  /* ── Fly-to-cart animation ── */
  const firefly = useCallback(() => {
    if (!ctaBtnRef.current || !cartBtnRef.current) return;
    const cta = ctaBtnRef.current.getBoundingClientRect();
    const cart = cartBtnRef.current.getBoundingClientRect();
    setFlyAnim({
      startX: cta.left + cta.width / 2,
      startY: cta.top + cta.height / 2,
      dx: (cart.left + cart.width / 2) - (cta.left + cta.width / 2),
      dy: (cart.top + cart.height / 2) - (cta.top + cta.height / 2),
    });
    setTimeout(() => {
      setFlyAnim(null);
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 500);
    }, 600);
  }, []);

  /* ── Add/Update Cart ── */
  const handleAddToCart = () => {
    const id = currentId;
    setCart((prev) => ({
      ...prev,
      [id]: { name: currentDish.name, nameUz: currentDish.nameUz, price: currentDish.price, image: currentData.image, qty: (prev[id]?.qty || 0) + 1 },
    }));
    firefly();
    spawnConfetti(ctaBtnRef.current);
  };
  const handleIncrement = () => {
    setCart((prev) => ({ ...prev, [currentId]: { ...prev[currentId], qty: prev[currentId].qty + 1 } }));
    firefly();
    spawnConfetti(ctaBtnRef.current);
  };
  const handleDecrement = () => {
    const id = currentId;
    setCart((prev) => {
      const next = { ...prev };
      if (next[id].qty <= 1) delete next[id]; else next[id] = { ...next[id], qty: next[id].qty - 1 };
      return next;
    });
  };
  const updateCartItem = (id, delta) => {
    setCart((prev) => {
      const next = { ...prev };
      const newQty = next[id].qty + delta;
      if (newQty <= 0) delete next[id]; else next[id] = { ...next[id], qty: newQty };
      return next;
    });
  };
  const clearCart = () => { setCart({}); setCartOpen(false); };

  if (!menuData) {
    return <LoadingScreen active={true} progress={0} />;
  }

  /* ═══ RENDER ═══ */
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans text-white select-none">
      
      <LoadingScreen active={isLoading} progress={loadProgress} />

      {view === 'intro' ? (
        <IntroScreen lang={lang} setLang={setLang} onMenuClick={handleEnterMenu} />
      ) : (
        <div 
          className="absolute inset-0 z-0" 
          onTouchStart={handleTouchStart} 
          onTouchEnd={handleTouchEnd}
        >
          {/* ── FULL-SCREEN BACKGROUND ── */}
          {categoryKeys.map((cat) => (
            <div key={cat} className="absolute inset-0 bg-transition" style={{ opacity: activeCategory === cat ? 1 : 0, zIndex: activeCategory === cat ? 1 : 0 }}>
              <img key={`${cat}-${contentKey}-${currentDishIndex}`} src={menuData[cat].image} alt={cat} className={`h-full w-full object-cover ${activeCategory === cat ? 'ken-burns' : ''}`} loading="eager" />
            </div>
          ))}

          {/* Dark overlays */}
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/90 via-black/45 to-black/35" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/30 via-transparent to-transparent" />

          {/* ── GLOBAL SHADOWS ── */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-[5] pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent z-[5] pointer-events-none" />

          {/* ── LEFT / RIGHT NAVIGATION ── */}
          {currentData?.dishes?.length > 1 && (
            <div className="absolute inset-0 z-[10] flex">
              <div className="flex-1 cursor-pointer" onClick={() => { if (currentDishIndex > 0) goToDish(currentDishIndex - 1); }} />
              <div className="flex-1 cursor-pointer" onClick={() => { if (currentDishIndex < currentData.dishes.length - 1) goToDish(currentDishIndex + 1); }} />
            </div>
          )}

          {/* ══════════════════════════════════════════
               CENTERED CONTAINER
              ══════════════════════════════════════════ */}
          <div className="relative z-[20] mx-auto h-full w-full max-w-[620px] flex flex-col pointer-events-none">
            
            {/* ── 1. HEADER (Top row: Logo, Lang, Cart) ── */}
            <header className="flex items-center justify-between px-5 pt-6 pb-2 flex-shrink-0 relative pointer-events-auto z-20">
              <span className="text-2xl sm:text-3xl font-serif font-bold tracking-wider text-white text-shadow cursor-pointer italic">
                Cofa Lova
              </span>
              <div className="flex items-center gap-3">
                <div className="glass flex items-center p-0.5 rounded-full">
                  <button onClick={() => setLang('RU')} className={`px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-300 cursor-pointer ${lang === 'RU' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}`}>RU</button>
                  <button onClick={() => setLang('UZ')} className={`px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-300 cursor-pointer ${lang === 'UZ' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}`}>UZ</button>
                </div>
                <button ref={cartBtnRef} onClick={() => setCartOpen(true)} className={`glass relative p-2.5 rounded-full text-white hover:bg-white/10 transition-all duration-300 cursor-pointer ${cartBounce ? 'animate-popIn' : ''}`}>
                  <ShoppingBag className="w-5 h-5" strokeWidth={1.8} />
                  {cartTotalCount > 0 && <span key={cartTotalCount} className="absolute -top-1.5 -right-1.5 w-[20px] h-[20px] flex items-center justify-center bg-lime-accent text-black text-[10px] font-bold rounded-full pulse-lime animate-popIn">{cartTotalCount}</span>}
                </button>
              </div>
            </header>

            {/* ── 2. PROGRESS BARS ── */}
            <div className="flex items-center gap-1.5 px-5 pt-2 pb-3 flex-shrink-0 relative pointer-events-auto z-20">
              {currentData?.dishes.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden cursor-pointer" onClick={() => goToDish(i)}>
                  <div className="h-full rounded-full bg-white" style={{ width: i < currentDishIndex ? '100%' : i === currentDishIndex ? `${progress * 100}%` : '0%', transition: i === currentDishIndex ? 'none' : 'width 0.3s ease' }} />
                </div>
              ))}
            </div>

            {/* ── 3. CATEGORY & NEW BADGE ── */}
            <div className="flex items-center gap-2 px-5 mb-2 flex-shrink-0 relative pointer-events-auto z-20">
              <span className="text-[12px] font-semibold tracking-[0.2em] text-white/70 uppercase text-shadow-sm">{catName(activeCategory)}</span>
              {currentDish?.isNew && <span className="bg-[#7cb342] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">NEW</span>}
            </div>

            {/* ── MAIN CONTENT ── */}
            <main key={contentKey} className="flex-1 flex flex-col justify-start px-5 pt-2 sm:pt-4 min-h-0 pointer-events-none">
              {currentDish ? (
                <>
                  <h2 className="text-[28px] sm:text-4xl font-bold text-white mb-2.5 leading-[1.1] text-shadow animate-fadeInUp-delay-1">{dName(currentDish)}</h2>
                  <p className="text-[13px] sm:text-[14px] text-white/65 font-light leading-relaxed max-w-[380px] text-shadow-sm animate-fadeInUp-delay-2">{dDesc(currentDish)}</p>
                </>
              ) : (
                <p className="text-white/50 text-sm italic mt-10">Bu kategoriyada hali taomlar yo'q</p>
              )}
            </main>

            {/* ── CTA / COUNTER BUTTON ── */}
            {currentDish && (
              <div className="flex-shrink-0 flex justify-center px-5 pb-3 relative pointer-events-auto">
                {currentInCart ? (
                  <div key={`counter-${currentId}-${currentInCart.qty}`} ref={ctaBtnRef} className="animate-morph flex items-center gap-4 bg-counter-bg text-black font-semibold px-3 py-2 rounded-full shadow-lg cursor-default">
                    <button onClick={handleDecrement} className="w-9 h-9 rounded-full bg-counter-btn flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                      <Minus className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </button>
                    <span className="text-[15px] font-semibold text-[#3a3530] whitespace-nowrap min-w-[90px] text-center select-none">
                      {currentInCart.qty} {ui[lang].inCart}
                    </span>
                    <button onClick={handleIncrement} className="w-9 h-9 rounded-full bg-counter-btn flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                      <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button ref={ctaBtnRef} onClick={handleAddToCart} className="animate-morph flex items-center gap-3 bg-lime-accent hover:bg-lime-accent-dark text-black font-semibold pl-6 pr-2 py-2.5 rounded-full floating-shadow hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer">
                    <span className={`text-sm font-semibold whitespace-nowrap ${priceFlash ? 'animate-priceFlash' : ''}`}>
                      {ui[lang].addToCart} · {formatPrice(animatedPrice)} {ui[lang].currency}
                    </span>
                    <span className="bg-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-lime-accent" strokeWidth={2.5} />
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* ── BOTTOM NAVIGATION ── */}
            <nav ref={navRef} className="flex-shrink-0 px-4 pb-5 pt-1 flex gap-2 overflow-x-auto no-scrollbar relative pointer-events-auto" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)' }}>
              {categoryKeys.map((cat) => (
                <button key={cat} data-active={activeCategory === cat} onClick={() => handleCategoryChange(cat)} className={`nav-item-hover flex-shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-300 cursor-pointer ${activeCategory === cat ? 'glass-active border-2 border-lime-accent text-white shadow-lg shadow-lime-accent/10' : 'glass text-white/80 hover:text-white hover:bg-white/5'}`}>{catName(cat)}</button>
              ))}
            </nav>
          </div>

          {/* ══════════════════════════════════════
               FLY-TO-CART & CONFETTI
              ══════════════════════════════════════ */}
          {flyAnim && (
            <div className="fixed z-[100] pointer-events-none" style={{ left: flyAnim.startX - 20, top: flyAnim.startY - 20, '--fly-target': `translate(${flyAnim.dx}px, ${flyAnim.dy}px)` }}>
              <div className="animate-flyToCart">
                <div className="w-10 h-10 rounded-full bg-lime-accent flex items-center justify-center shadow-lg"><Plus className="w-5 h-5 text-black" strokeWidth={2.5} /></div>
              </div>
            </div>
          )}

          {confetti.map((dot) => (
            <div key={dot.id} className="confetti-dot" style={{ left: dot.x, top: dot.y, width: dot.size, height: dot.size, backgroundColor: dot.color, '--cx': `${dot.dx}px`, '--cy': `${dot.dy}px` }} />
          ))}

          {/* ══════════════════════════════════════
               CART MODAL
              ══════════════════════════════════════ */}
          {cartOpen && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setCartOpen(false)}>
              <div className="absolute inset-0 bg-black/50 animate-fadeIn" />
              <div className="relative w-full max-w-[620px] max-h-[70vh] bg-white rounded-t-3xl animate-slideUp flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
                <div className="flex items-center justify-between px-5 pb-3 pt-1">
                  <h3 className="text-lg font-bold text-gray-900">{ui[lang].cart}</h3>
                  <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"><X className="w-4 h-4 text-gray-600" strokeWidth={2} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 min-h-0">
                  {Object.keys(cart).length === 0 ? (
                    <p className="text-gray-400 text-center py-10 text-sm">{lang === 'RU' ? 'Корзина пуста' : 'Savat bo\'sh'}</p>
                  ) : (
                    Object.entries(cart).map(([id, item]) => (
                      <div key={id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                        <img src={item.image} alt={lang === 'UZ' ? item.nameUz : item.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{lang === 'UZ' ? (item.nameUz || item.name) : item.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.price)} {ui[lang].currency}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => updateCartItem(id, -1)} className="w-7 h-7 rounded-full bg-[#5C5650] flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"><Minus className="w-3 h-3 text-white" strokeWidth={2.5} /></button>
                          <span className="text-sm font-semibold text-gray-800 w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateCartItem(id, 1)} className="w-7 h-7 rounded-full bg-lime-accent flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"><Plus className="w-3 h-3 text-black" strokeWidth={2.5} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {Object.keys(cart).length > 0 && (
                  <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">{ui[lang].total}</span>
                      <span className="text-lg font-bold text-gray-900">{formatPrice(cartTotalPrice)} {ui[lang].currency}</span>
                    </div>
                    <button onClick={clearCart} className="w-full py-3 rounded-xl bg-[#3a3530] text-white font-semibold text-sm hover:bg-[#2a2520] transition-colors cursor-pointer">{ui[lang].clear}</button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
