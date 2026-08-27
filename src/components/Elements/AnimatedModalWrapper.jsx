import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const modalStyles = `
.animated-modal-wrapper {
  position: fixed;
  inset: 0;
  z-index: 99999;
}
.animated-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.animated-modal-container {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px;
  box-sizing: border-box;
}
.animated-modal-content {
  display: inline-flex;
  will-change: transform, opacity, border-radius;
  width: 100%;
  max-width: fit-content;
}
.animated-modal-content > * {
  border-radius: inherit !important;
}
@media (max-width: 480px) {
  .animated-modal-content {
    max-width: 100%;
  }
}
`;

const AnimatedModalWrapper = ({ isOpen, onClose, children, targetBorderRadius = "24px", zIndex = 99999 }) => {
  const [openPos, setOpenPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [closePos, setClosePos] = useState(null);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (!isOpen) {
        setOpenPos({ x: e.clientX, y: e.clientY });
        setClosePos(null);
      } else {
        setClosePos({ x: e.clientX, y: e.clientY });
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const originPos = closePos || openPos;
  
  const initialX = originPos.x - window.innerWidth / 2;
  const initialY = originPos.y - window.innerHeight / 2;

  const modalVariants = {
    hidden: { 
      x: initialX, 
      y: initialY, 
      scale: 0.05, 
      opacity: 0,
      borderRadius: "50%"
    },
    visible: { 
      x: 0, 
      y: 0, 
      scale: 1, 
      opacity: 1,
      borderRadius: targetBorderRadius,
      transition: { 
        duration: 0.7, 
        ease: [0.16, 1, 0.3, 1],
        x: {
          delay: 0.05,
          duration: 0.65,
          ease: [0.16, 1, 0.3, 1]
        },
        y: {
          delay: 0.05,
          duration: 0.65,
          ease: [0.16, 1, 0.3, 1]
        },
        scale: {
          duration: 0.6,
          delay: 0.15,
          ease: [0.16, 1, 0.3, 1]
        },
        borderRadius: {
          duration: 0.6,
          delay: 0.15,
          ease: [0.16, 1, 0.3, 1]
        },
        opacity: {
          duration: 0.05
        }
      }
    },
    exit: { 
      x: initialX, 
      y: initialY, 
      scale: 0.05, 
      opacity: 0,
      borderRadius: "50%",
      transition: { 
        duration: 0.58, 
        ease: [0.16, 1, 0.3, 1],
        scale: {
          duration: 0.58,
          ease: [0.16, 1, 0.3, 1]
        },
        borderRadius: {
          duration: 0.58,
          ease: [0.16, 1, 0.3, 1]
        },
        opacity: {
          duration: 0.13,
          delay: 0.45
        }
      }
    }
  };

  const modalContent = (
    <>
      <style>{modalStyles}</style>
      <AnimatePresence>
        {isOpen && (
          <div key="modal-wrapper" className="animated-modal-wrapper" style={{ zIndex }} onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}>
            <motion.div
              className="animated-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
            <div className="animated-modal-container" style={{ pointerEvents: 'none' }}>
              <motion.div
                className="animated-modal-content"
                style={{ pointerEvents: 'auto' }}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {children}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default AnimatedModalWrapper;
