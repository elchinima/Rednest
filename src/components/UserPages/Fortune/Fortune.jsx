import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import Footer from '../../Footer/Footer';
import Navbar from '../../Elements/Navbar';
import partyPopperIcon from '../../../assets/icons/party-popper-animated.svg';
import smileyIcon from '../../../assets/icons/smiley-animated.svg';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
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
  const { user } = useAuth();

  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');
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
        if (data.hasPromo) {
          setServerPromo(data);
          setCanSpin(Boolean(data.canSpin));
          if (data.cooldownEndsAt) {
            setCooldownEndsAt(data.cooldownEndsAt);
          }
        } else {
          setCanSpin(true);
          setCooldownEndsAt(null);
        }
      })
      .catch(() => { setCanSpin(true); })
      .finally(() => { setPromoChecked(true); });
  }, [user]);

  useEffect(() => {
    if (canSpin || !cooldownEndsAt) {
      setTimeLeftStr('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(cooldownEndsAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCanSpin(true);
        setTimeLeftStr('');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeftStr(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeftStr(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [canSpin, cooldownEndsAt]);


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
      const size = Math.min(canvas.parentElement?.clientWidth ?? 412, 412);
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
          setCanSpin(false);
          setPrize(seg);
          setServerPromo({
            promoCode: seg.promoCode,
            barCode: seg.barCode,
            expiresAt: seg.expiresAt,
            prizeName: seg.label,
            prizeDescription: seg.prize,
            isActive: true,
          });
          setCooldownEndsAt(serverResult.cooldownEndsAt || seg.expiresAt);
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

  return (
    <motion.div
      className="fortune-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

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
                timeLeftStr || (serverPromo?.isActive ? 'Promo already active!' : '1 spin per week')
              ) : (
                'Spin the Wheel!'
              )}
            </motion.button>

            {!canSpin && !spinning && promoChecked && (
              <motion.div
                className="fortune-cooldown-box"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="fortune-note">
                  {serverPromo?.isActive
                    ? 'You have an active promo code ✨'
                    : 'You have already spun the wheel this week.'}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

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