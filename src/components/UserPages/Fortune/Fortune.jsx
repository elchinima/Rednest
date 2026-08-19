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
import fortuneImg from '../../../assets/images/fortune_image_low.png';
import './Fortune.scss';

const SEGMENTS = [
  { label: 'SUPER PRIZE', prize: 'Super prize: Special exclusive Rednest gift!' },
  { label: 'FREE DRINK', prize: 'One free drink of your choice!' },
  { label: 'FREE DESSERT', prize: 'One free dessert with your next order!' },
  { label: 'DISCOUNT UP TO 25%', prize: '25% discount on your next order!' },
  { label: 'CASHBACK ON PURCHASES', prize: 'Cashback on your next coffee purchase!' },
  { label: 'DISCOUNT UP TO 50%', prize: '50% discount on your next order!' },
];

const NUM_SEGMENTS = SEGMENTS.length;
const ARC = (2 * Math.PI) / NUM_SEGMENTS;

function drawWheel(canvas, rotation, image) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  ctx.clearRect(0, 0, W, H);

  if (!image) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(image, -cx, -cy, W, H);
  ctx.restore();
}

const Fortune = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const rotationRef = useRef(0);
  const imageRef = useRef(null);
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
  const [canSpin, setCanSpin] = useState(false);
  const [promoChecked, setPromoChecked] = useState(false);
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
        if (data.hasPromo && data.isActive) {
          setServerPromo(data);
          setCanSpin(false);
        } else {
          setCanSpin(true);
        }
      })
      .catch(() => { setCanSpin(true); })
      .finally(() => { setPromoChecked(true); });
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
      drawWheel(canvasRef.current, rotationRef.current, imageRef.current);
    }
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = fortuneImg;
    img.onload = () => {
      imageRef.current = img;
      drawFrame();
    };
    if (img.complete) {
      imageRef.current = img;
      drawFrame();
    }
  }, [drawFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.min(canvas.parentElement?.clientWidth ?? 485, 485);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      drawFrame();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawFrame]);

  const spin = useCallback(async () => {
    if (spinning || !canSpin) return;

    setSpinning(true);
    setCanSpin(false);
    setPrize(null);
    setShowPrize(false);

    const apiUrl = import.meta.env.VITE_API_URL || '';
    let serverResult = null;

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/auth/promo`, { method: 'POST' });
      if (res.ok) {
        serverResult = await res.json();
      }
    } catch (_) {}

    if (!serverResult) {
      setSpinning(false);
      setCanSpin(true);
      return;
    }

    const winIdx = serverResult.segmentIndex;
    const seg = {
      label: serverResult.prizeName,
      prize: serverResult.prizeDescription,
      promoCode: serverResult.promoCode,
      barCode: serverResult.barCode,
      expiresAt: serverResult.expiresAt,
      cashbackPercent: serverResult.cashbackPercent,
    };

    const jitter = (Math.random() - 0.5) * (ARC * 0.4);
    const targetAngle = -winIdx * ARC + jitter;
    const normalizedTarget = ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    let phase = 'accelerating';
    let currentSpeed = 0;
    const maxSpeed = 0.015;
    const accel = 0.00002;
    const minSpinMs = 3000 + Math.random() * 1000;
    const startTime = performance.now();

    let decelStartTime = 0;
    let decelStartRotation = 0;
    let decelTotalDistance = 0;
    let decelDuration = 0;

    let lastTime = performance.now();

    const animate = (now) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      if (phase === 'accelerating') {
        currentSpeed += accel * dt;
        if (currentSpeed >= maxSpeed) {
          currentSpeed = maxSpeed;
          phase = 'spinning';
        }
        rotationRef.current += currentSpeed * dt;
      } else if (phase === 'spinning') {
        rotationRef.current += currentSpeed * dt;

        if (now - startTime >= minSpinMs) {
          phase = 'decelerating';
          decelStartTime = now;
          decelStartRotation = rotationRef.current;

          const baseDistance = (currentSpeed * 3000) / 3;
          const targetRot = decelStartRotation + baseDistance;
          const remainder = targetRot % (2 * Math.PI);
          let extraRot = normalizedTarget - remainder;
          if (extraRot < 0) extraRot += 2 * Math.PI;

          decelTotalDistance = baseDistance + extraRot;
          decelDuration = (3 * decelTotalDistance) / currentSpeed;
        }
      } else if (phase === 'decelerating') {
        const elapsed = now - decelStartTime;
        const t = Math.min(elapsed / decelDuration, 1);
        const easeOut = 1 - Math.pow(1 - t, 3);
        rotationRef.current = decelStartRotation + decelTotalDistance * easeOut;

        if (t >= 1) {
          setSpinning(false);
          setPrize(seg);
          setServerPromo({ promoCode: seg.promoCode, barCode: seg.barCode, expiresAt: seg.expiresAt });
          setShowPrize(true);
          drawFrame();
          return;
        }
      }

      drawFrame();
      rafRef.current = requestAnimationFrame(animate);
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
              className={`cta-btn fortune-spin-btn lg${spinning ? ' fortune-spin-btn--spinning' : ''}${!canSpin && !spinning && promoChecked ? ' fortune-spin-btn--used' : ''}`}
              onClick={spin}
              disabled={spinning || !canSpin || !promoChecked}
              whileHover={canSpin && !spinning && promoChecked ? { scale: 1.04, y: -2 } : {}}
              whileTap={canSpin && !spinning && promoChecked ? { scale: 0.97 } : {}}
            >
              {spinning ? (
                <span className="fortune-spin-btn__inner">
                  <span className="fortune-spin-dot" />
                  Spinning...
                </span>
              ) : !promoChecked ? (
                <span className="fortune-spin-btn__inner">
                  <span className="fortune-spin-dot" />
                  Loading...
                </span>
              ) : !canSpin ? (
                'Promo already active!'
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
                You already have an active promo code ✨
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