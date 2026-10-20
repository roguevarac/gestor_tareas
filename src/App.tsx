import { useEffect, useState } from 'react';
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
import { TeamModal } from './components/TeamModal';
import { LaunchedFish, SendFishDialog } from './components/SendFishDialog';
import { IncomingFish } from './components/IncomingFish';
import { Pecera } from './components/Pecera';
import { SentPanel } from './components/SentList';
import { InstallBanner } from './components/InstallBanner';
import { TeamBoard } from './components/TeamBoard';
import { FishingRod } from './components/FishingRod';
import { Bait } from './components/Bait';
import { UpdateBanner } from './components/UpdateBanner';
import { Matrix, readView, ViewSwitch, type View } from './components/Matrix';

export default function App() {
  useEffect(() => syncAcrossTabs(), []);
  useEffect(() => void startSharing(), []);
  useIncomingMail();
  const [view, setView] = useState<View>(readView);

  return (
    <>
      <Ocean />
      <div className="app">
        <Header />
        <InstallBanner />
        <ViewSwitch view={view} onChange={setView} />
        {view === 'matrix' ? (
          <main>
            <Matrix />
          </main>
        ) : (
          <main className="ponds">
            <Pond kind="quick" />
            <Pond kind="project" />
          </main>
        )}
      </div>
      <Bucket />
      <CatchCard />
      <FishOverlay />
      <TaskDetail />
      <LogPanel />
      <HelpOutlook />
      <IncomingMail />
      <TeamModal />
      <SendFishDialog />
      <Pecera />
      <SentPanel />
      <IncomingFish />
      <LaunchedFish />
      <TeamBoard />
      <FishingRod />
      <Bait />
      <UpdateBanner />
      <Toasts />
    </>
  );
}
