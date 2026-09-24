import React from 'react';
import { motion } from 'framer-motion';

const BANKNOTES = [5, 20, 50, 100];

const CashboxNumpad = ({
  receivedAmount,
  changeAmount,
  totalAmount,
  onNumpadPress,
  onBanknoteClick,
  onPayCard,
  onPayCash,
}) => {
  return (
    <div className="cashbox-numpad">
      <div className="cashbox-numpad__grid">
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('7')}>7</button>
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('8')}>8</button>
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('9')}>9</button>
        <button type="button" className="cashbox-numpad__key cashbox-numpad__key--note" onClick={() => onBanknoteClick(5)}>5₼</button>

        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('4')}>4</button>
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('5')}>5</button>
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('6')}>6</button>
        <button type="button" className="cashbox-numpad__key cashbox-numpad__key--note" onClick={() => onBanknoteClick(20)}>20₼</button>

        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('1')}>1</button>
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('2')}>2</button>
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('3')}>3</button>
        <button type="button" className="cashbox-numpad__key cashbox-numpad__key--note" onClick={() => onBanknoteClick(50)}>50₼</button>

        <button type="button" className="cashbox-numpad__key cashbox-numpad__key--fn" onClick={() => onNumpadPress('.')}>.</button>
        <button type="button" className="cashbox-numpad__key" onClick={() => onNumpadPress('0')}>0</button>
        <button type="button" className="cashbox-numpad__key cashbox-numpad__key--fn" onClick={() => onNumpadPress('⌫')} title="Backspace">⌫</button>
        <button type="button" className="cashbox-numpad__key cashbox-numpad__key--note" onClick={() => onBanknoteClick(100)}>100₼</button>
      </div>

      <div className="cashbox-numpad__tender">
        <div className="cashbox-numpad__tender-row">
          <span className="cashbox-numpad__tender-label">Received:</span>
          <span className="cashbox-numpad__tender-val">{receivedAmount} ₼</span>
          <span className="cashbox-numpad__tender-sep">|</span>
          <span className="cashbox-numpad__tender-label">Change:</span>
          <span className={`cashbox-numpad__tender-val ${changeAmount > 0 ? 'cashbox-numpad__tender-val--green' : ''}`}>
            {changeAmount.toFixed(2)} ₼
          </span>
        </div>
      </div>

      <div className="cashbox-numpad__actions">
        <motion.button
          type="button"
          className="cashbox-numpad__pay-btn cashbox-numpad__pay-btn--card"
          whileTap={{ scale: 0.97 }}
          onClick={onPayCard}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Pay by Card</span>
        </motion.button>

        <motion.button
          type="button"
          className="cashbox-numpad__pay-btn cashbox-numpad__pay-btn--cash"
          whileTap={{ scale: 0.97 }}
          onClick={onPayCash}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
          <span>Cash Payment</span>
        </motion.button>
      </div>
    </div>
  );
};

export default CashboxNumpad;
