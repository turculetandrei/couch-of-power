'use client';

import { EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, seedFromName } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SlipCard } from '@/components/game/slip-card';
import { useT } from '@/lib/i18n/context';

/** Blur everything marked `.secret` while the app isn't in the foreground. */
export function useHideWhenBackgrounded() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const set = (v: boolean) => {
      root.dataset.hidden = String(v);
      setHidden(v);
    };
    const onVis = () => set(document.hidden);
    const onBlur = () => set(true);
    const onFocus = () => set(false);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      delete root.dataset.hidden;
    };
  }, []);
  return hidden;
}

/**
 * One hand-over: "Pass the phone to X" → X confirms → X holds to peek → hide.
 * Calls onDone after X has seen the slip and taps hide.
 */
export function PassPhone({
  holder,
  slipName,
  accent,
  progress,
  onDone,
}: {
  holder: string;
  slipName: string;
  accent: string;
  progress?: string;
  onDone: () => void;
}) {
  const t = useT();
  const [stage, setStage] = useState<'handover' | 'reveal'>('handover');
  const [seen, setSeen] = useState(false);
  const hidden = useHideWhenBackgrounded();

  useEffect(() => {
    setStage('handover');
    setSeen(false);
  }, [holder]);

  return (
    <div className="relative flex flex-1 flex-col">
      {progress && <p className="tabular text-center text-[13px] text-fg-2">{progress}</p>}

      {stage === 'handover' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
          <Avatar seed={seedFromName(holder)} size={112} />
          <div>
            <p className="text-[17px] text-fg-2">{t.deal.passTo}</p>
            <p className="mt-1 text-[44px] leading-tight font-light break-words">{holder}</p>
          </div>
          <p className="text-[14px] text-fg-3">{t.deal.notYou}</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
          <p className="text-[17px]">{holder}</p>
          <SlipCard
            name={slipName}
            caption={t.deal.yourSlip}
            hint={t.deal.holdToSee}
            srLabel={`${t.deal.yourSlip}. ${t.deal.holdToSee}, ${t.deal.holdHintKeyboard}`}
            accent={accent}
            onReveal={() => setSeen(true)}
            className="h-[300px] w-[214px]"
          />
          <p className="text-[13px] text-fg-3">{t.deal.holdHintKeyboard}</p>
        </div>
      )}

      <div className="safe-bottom sticky bottom-0 bg-bg pt-3">
        {stage === 'handover' ? (
          <Button variant="primary" size="lg" block onClick={() => setStage('reveal')}>
            {t.deal.iAm(holder)}
          </Button>
        ) : (
          <Button variant="outline" size="lg" block disabled={!seen} onClick={onDone} icon={<EyeOff size={20} />}>
            {t.deal.seenNext}
          </Button>
        )}
      </div>

      {hidden && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black p-8 text-center">
          <EyeOff size={36} className="text-fg-2" />
          <p className="max-w-[28ch] text-[15px] text-fg-2">{t.deal.hiddenNote}</p>
        </div>
      )}
    </div>
  );
}
