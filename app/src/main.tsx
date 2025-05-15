import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WalletContextProvider from './components/WalletContextProvider.tsx';

import App from './App.tsx'

import './index.css'
import "@solana/wallet-adapter-react-ui/styles.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletContextProvider>
      <App />
    </WalletContextProvider>
  </StrictMode>,
)
