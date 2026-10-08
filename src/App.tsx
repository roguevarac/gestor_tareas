import { useEffect } from 'react';
import { syncAcrossTabs } from './store/tasks';
import { Ocean } from './components/Ocean';
import { Header } from './components/Header';
import { Pond } from './components/Ponds';
import { Bucket } from './components/Bucket';
import { FishOverlay } from './components/FishOverlay';
import { CatchCard } from './components/CatchCard';
import { TaskDetail } from './components/TaskDetail';
import { LogPanel } from './components/LogPanel';
import { HelpOutlook } from './components/HelpOutlook';
import { IncomingMail, useIncomingMail } from './components/IncomingMail';
import { Toasts } from './components/Toasts';
import { startSharing } from './store/shared';
import { AuthModal } from './components/AuthModal';
import { LaunchedFish, SendFishDialog } from './components/SendFishDialog';
import { IncomingFish } from './components/IncomingFish';
import { Pecera } from './components/Pecera';

export default function App() {
  useEffect(() => syncAcrossTabs(), []);
  useEffect(() => void startSharing(), []);
  useIncomingMail();

  return (
    <>
      <Ocean />
      <div className="app">
        <Header />
        <main className="ponds">
          <Pond kind="quick" />
          <Pond kind="project" />
        </main>
      </div>
      <Bucket />
      <CatchCard />
      <FishOverlay />
      <TaskDetail />
      <LogPanel />
      <HelpOutlook />
      <IncomingMail />
      <AuthModal />
      <SendFishDialog />
      <Pecera />
      <IncomingFish />
      <LaunchedFish />
      <Toasts />
    </>
  );
}
