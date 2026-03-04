import React from "react";

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

const MODAL_STYLES = `
  .ls-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: var(--ls-font);
    color: var(--ls-text);
    padding: 16px;
  }
  .ls-modal-container {
    background: var(--ls-bg, #fff);
    border-radius: var(--ls-radius, 16px);
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: ls-modal-in 0.25s ease-out;
  }
  @media (max-width: 480px) {
    .ls-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }
    .ls-modal-container {
      max-width: 100%;
      max-height: 95vh;
      border-radius: var(--ls-radius, 16px) var(--ls-radius, 16px) 0 0;
      animation: ls-modal-slide-up 0.3s ease-out;
    }
  }
  @keyframes ls-modal-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes ls-modal-slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

export function Modal({ children, onClose }: ModalProps) {
  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="ls-modal-overlay" onClick={onClose}>
        <div className="ls-modal-container" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </>
  );
}
