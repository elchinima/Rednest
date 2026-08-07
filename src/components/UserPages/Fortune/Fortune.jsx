import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import logo from '../../../assets/icons/rednest_logo.png';
import Footer from '../../Footer/Footer';
import LogoutModal from '../../Elements/LogoutModal';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import partyPopperIcon from '../../../assets/icons/party-popper-animated.svg';
import smileyIcon from '../../../assets/icons/smiley-animated.svg';
import './Fortune.scss';

const SEGMENTS = [
  { label: '10% OFF',    color: '#7f1d1d', textColor: '#fff', prize: '10% discount on your next order' },
  { label: 'Free Ship', color: '#450a0a', textColor: 'rgba(255,255,255,0.85)', prize: 'Free shipping on your next order' },
  { label: '5% OFF',    color: '#991b1b', textColor: '#fff', prize: '5% discount on your next order' },
  { label: '1 Coffee',  color: '#7f1d1d', textColor: '#fff', prize: 'One free coffee of your choice!' },
  { label: '15% OFF',   color: '#450a0a', textColor: '#fff', prize: '15% discount on your next order' },
  { label: 'Try Again', color: '#3b0a0a', textColor: 'rgba(255,255,255,0.45)', prize: null },
  { label: '20% OFF',   color: '#7f1d1d', textColor: '#fff', prize: '20% discount on your next order' },
  { label: 'Free Bag',  color: '#450a0a', textColor: 'rgba(255,255,255,0.85)', prize: 'Free coffee bag with next order!' },
];

const NUM_SEGMENTS = SEGMENTS.length;
const ARC = (2 * Math.PI) / NUM_SEGMENTS;

function drawWheel(canvas, rotation) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(cx, cy) - 6;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const startAngle = rotation + i * ARC;
    const endAngle = startAngle + ARC;
    const seg = SEGMENTS[i];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();

    const grad = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + ARC / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = seg.textColor;
    ctx.font = `600 ${Math.round(R * 0.088)}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText(seg.label, R - 14, 5);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.11);
  hubGrad.addColorStop(0, '#ffffff');
  hubGrad.addColorStop(1, '#e5e5e5');
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.11, 0, 2 * Math.PI);
  ctx.fillStyle = hubGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.11, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

const Fortune = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const rotationRef = useRef(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);
  const { user, logout, isAuthLoading } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [prize, setPrize] = useState(null);
  const [showPrize, setShowPrize] = useState(false);
  const [serverPromo, setServerPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetchWithRefresh(`${apiUrl}/api/auth/promo`)
      .then(r => r.json())
      .then(data => {
        if (data.hasPromo && !data.isExpired) {
          setServerPromo(data);
          setCanSpin(false);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

  const drawFrame = useCallback(() => {
    if (canvasRef.current) {
      drawWheel(canvasRef.current, rotationRef.current);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.min(canvas.parentElement?.clientWidth ?? 460, 460);
      canvas.width = size;
      canvas.height = size;
      drawFrame();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawFrame]);

  const spin = useCallback(() => {
    if (spinning || !canSpin) return;

    setSpinning(true);
    setCanSpin(false);
    setPrize(null);

    const winIdx = Math.floor(Math.random() * NUM_SEGMENTS);
    const totalSpins = (5 + Math.random() * 3) * 2 * Math.PI;
    const targetAngle = -Math.PI / 2 - (winIdx * ARC + ARC / 2);
    const normalizedTarget = ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const finalRotation = totalSpins + normalizedTarget;

    const startRotation = rotationRef.current;
    const duration = 5000 + Math.random() * 1500;
    const startTime = performance.now();

    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      rotationRef.current = startRotation + finalRotation * easeOut(progress);
      drawFrame();

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const seg = SEGMENTS[winIdx];
        setPrize(seg);

        if (seg.prize) {
          setPromoLoading(true);
          const apiUrl = import.meta.env.VITE_API_URL || '';
          fetchWithRefresh(`${apiUrl}/api/auth/promo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prizeName: seg.label,
              prizeDescription: seg.prize
            })
          })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data) {
                setServerPromo({ promoCode: data.promoCode, barCode: data.barCode, expiresAt: data.expiresAt });
              }
              setPromoLoading(false);
              setShowPrize(true);
            })
            .catch(() => { setPromoLoading(false); setShowPrize(true); });
        } else {
          setShowPrize(true);
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [spinning, canSpin, drawFrame]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      logout();
      setIsLogoutModalOpen(false);
      navigate('/');
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <motion.div
      className="fortune-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="home-header">
        <div className="logo-container">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logo} alt="Rednest Logo" className="logo" />
            <span className="brand-name">Rednest</span>
          </Link>
        </div>

        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          <nav className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/catalog" className="nav-link">Menu</Link>
          </nav>
          {isAuthLoading ? (
            <span className="cta-btn sm no-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', pointerEvents: 'none' }}>
              <img src={loaderIcon} alt="Loading" style={{ width: '20px', height: '20px', filter: 'brightness(0)' }} />
            </span>
          ) : user ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button className="cta-btn sm" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ cursor: 'pointer' }}>Hello, {user.name}</button>
              {isUserMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    marginTop: '8px',
                    zIndex: 100
                  }}
                >
                  <button 
                    className="cta-btn sm"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    style={{
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    Log Out
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <Link to="/login" className="cta-btn sm" style={{ textDecoration: 'none' }}>Log In</Link>
          )}
        </div>

        <div
          className={`menu-overlay ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(false)}
        />

        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <main className="fortune-main">
        <div className="fortune-content-wrapper">
          <motion.div
            className="fortune-hero-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>{user?.name ? `Hey, ${user.name}!` : '🎡 Wheel of Fortune'}</h1>
            <p>
              Spin the wheel and win an exclusive Rednest reward!
            </p>
          </motion.div>

          <motion.div
            className="fortune-wheel-area"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="fortune-wheel-wrap">
              <div className="fortune-pointer" aria-hidden="true">
                <svg viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="18,42 1,5 35,5" fill="#ffffff" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
                  <circle cx="18" cy="8" r="4.5" fill="rgba(255,255,255,0.9)"/>
                </svg>
              </div>

              <canvas ref={canvasRef} className="fortune-canvas" />
            </div>

            <motion.button
              className={`cta-btn fortune-spin-btn lg${spinning ? ' fortune-spin-btn--spinning' : ''}${!canSpin && !spinning ? ' fortune-spin-btn--used' : ''}`}
              onClick={spin}
              disabled={spinning || !canSpin}
              whileHover={canSpin && !spinning ? { scale: 1.04, y: -2 } : {}}
              whileTap={canSpin && !spinning ? { scale: 0.97 } : {}}
            >
              {spinning ? (
                <span className="fortune-spin-btn__inner">
                  <span className="fortune-spin-dot" />
                  Spinning...
                </span>
              ) : !canSpin ? (
                'Already spun today!'
              ) : (
                'Spin the Wheel!'
              )}
            </motion.button>

            {!canSpin && !spinning && (
              <motion.p
                className="fortune-note"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Come back tomorrow for another spin ✨
              </motion.p>
            )}
          </motion.div>
        </div>
      </main>

      <LogoutModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
      />

      <Footer />

      <AnimatePresence>
        {showPrize && prize && (
          <motion.div
            className="fortune-prize-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPrize(false)}
          >
            <motion.div
              className="fortune-prize-modal"
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {prize.prize ? (
                <>
                  <div className="prize-emoji">
                    <img src={partyPopperIcon} alt="Party Popper" style={{ width: '70px', height: '70px' }} />
                  </div>
                  <h2 className="prize-heading">Congratulations!</h2>
                  <p className="prize-label">{prize.label}</p>
                  <p className="prize-desc">{prize.prize}</p>
                  {promoLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                      <img src={loaderIcon} alt="Loading..." style={{ width: '32px', height: '32px' }} />
                    </div>
                  ) : serverPromo?.promoCode ? (
                    <>
                      <p className="prize-code-label">Your promo code</p>
                      <div className="prize-code">{serverPromo.promoCode}</div>
                      {serverPromo.expiresAt && (
                        <p className="prize-code-label" style={{ marginTop: '6px', fontSize: '0.75rem', opacity: 0.6 }}>
                          Valid until {new Date(serverPromo.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="prize-emoji">
                    <img src={smileyIcon} alt="Smiley" style={{ width: '70px', height: '70px' }} />
                  </div>
                  <h2 className="prize-heading">Better luck next time!</h2>
                  <p className="prize-desc">Don't worry — there's always tomorrow's spin!</p>
                </>
              )}
              <button className="cta-btn secondary prize-close-btn" onClick={() => setShowPrize(false)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Fortune;