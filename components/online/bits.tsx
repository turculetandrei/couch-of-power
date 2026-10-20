'use client';

import { Check, Copy, Share2, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import type { Conn } from '@/lib/client/use-room';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';

export function ConnBadge({ conn }: { conn: Conn }) {
  const t = useT();
  const color = conn === 'live' ? 'bg-go' : conn === 'offline' ? 'bg-danger' : 'bg-pot animate-pulse';
  return (
    <span
      role="status"
      className="flex h-11 items-center gap-2 rounded-full border-2 border-line px-3 text-[13px] text-fg-2"
      title={t.conn[conn]}
    >
      <span className={cn('size-2 rounded-full', color)} aria-hidden />
      <span className="max-sm:sr-only">{t.conn[conn]}</span>
    </span>
  );
}

export function OfflineBanner({ conn }: { conn: Conn }) {
  const t = useT();
  if (conn !== 'offline' && conn !== 'reconnecting') return null;
  return (
    <div role="alert" className="mb-2 flex items-center gap-2 rounded-full bg-raised px-4 py-2.5 text-[13px] text-fg-2">
      <WifiOff size={16} className={conn === 'offline' ? 'text-danger' : 'text-pot'} />
      {conn === 'offline' ? t.conn.offlineBanner : t.conn.reconnecting}
    </div>
  );
}

/** One transient message at a time, announced to screen readers. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 3200);
    return () => clearTimeout(id);
  }, [msg]);
  const node = (
    <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
      {msg && (
        <p className="rounded-full border-2 border-line bg-raised px-5 py-3 text-[14px] shadow-2xl">{msg}</p>
      )}
    </div>
  );
  return [node, setMsg] as const;
}

export function ShareSheet({ open, onClose, code }: { open: boolean; onClose: () => void; code: string }) {
  const t = useT();
  const [svg, setSvg] = useState('');
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => setUrl(`${location.origin}/r/${code}`), [code]);
  useEffect(() => {
    if (!open || !url) return;
    QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' }, errorCorrectionLevel: 'M' })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [open, url]);

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <Sheet open={open} onClose={onClose} title={t.lobby.share}>
      <div className="flex flex-col items-center gap-5 pb-2">
        <p className="tabular text-[48px] font-light tracking-[0.25em]" aria-label={code.split('').join(' ')}>
          {code}
        </p>
        {svg && (
          <div
            className="size-56 overflow-hidden rounded-tile bg-white p-3"
            role="img"
            aria-label={t.lobby.qrHint}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        <p className="text-[13px] text-fg-2">{t.lobby.qrHint}</p>
        <div className="grid w-full grid-cols-2 gap-3">
          <Button
            variant="line"
            icon={copied ? <Check size={18} className="text-go" /> : <Copy size={18} />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {}
            }}
          >
            {copied ? t.lobby.copied : t.lobby.copyLink}
          </Button>
          <Button
            variant="primary"
            disabled={!canShare}
            icon={<Share2 size={18} />}
            onClick={() => navigator.share?.({ title: 'Couch of Power', text: t.lobby.shareText(code), url }).catch(() => {})}
          >
            {t.lobby.share}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
