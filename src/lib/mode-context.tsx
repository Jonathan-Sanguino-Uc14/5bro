import React, { createContext, useContext, useEffect, useState } from 'react';
import { getPin } from './pin';

export type AppMode = 'cashier' | 'admin';

interface AppModeContextType {
  mode: AppMode;
  unlockAdmin: () => void;
  lockAdmin: () => void;
  hasPin: boolean;
  setHasPin: (v: boolean) => void;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: 'cashier',
  unlockAdmin: () => {},
  lockAdmin: () => {},
  hasPin: false,
  setHasPin: () => {},
});

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>('cashier');
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    getPin().then((pin) => {
      setHasPin(pin !== null);
    }).catch(() => {
      setHasPin(false);
    });
  }, []);

  function unlockAdmin() {
    setMode('admin');
  }

  function lockAdmin() {
    setMode('cashier');
  }

  return (
    <AppModeContext.Provider value={{ mode, unlockAdmin, lockAdmin, hasPin, setHasPin }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppModeContextType {
  return useContext(AppModeContext);
}
