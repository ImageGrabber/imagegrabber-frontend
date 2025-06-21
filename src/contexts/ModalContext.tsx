'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type AuthMode = 'login' | 'register';

interface ModalContextType {
  isModalOpen: boolean;
  modalMode: AuthMode;
  customMessage: string;
  openModal: (mode?: AuthMode, message?: string) => void;
  closeModal: () => void;
  setModalMode: (mode: AuthMode) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<AuthMode>('login');
  const [customMessage, setCustomMessage] = useState('');

  const openModal = (mode: AuthMode = 'login', message: string = '') => {
    setModalMode(mode);
    setCustomMessage(message);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCustomMessage('');
  };

  return (
    <ModalContext.Provider value={{ isModalOpen, modalMode, customMessage, openModal, closeModal, setModalMode }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}; 