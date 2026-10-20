'use client';

import { LogOut, MoreHorizontal, Square } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, seedFromName } from '@/components/ui/avatar';
import { Button, ButtonLink, IconButton } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { LangToggle, TopBar } from '@/components/ui/top-bar';
import { ConnBadge, OfflineBanner, useToast } from '@/components/online/bits';
import { GameScreen } from '@/components/online/game-screen';
import { Lobby } from '@/components/online/lobby';
import { ApiError, NICK_KEY } from '@/lib/client/api';
import { useRoom } from '@/lib/client/use-room';
import { useT } from '@/lib/i18n/context';
import { storage } from '@/lib/storage';

export default function RoomPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? '').toUpperCase();
  const room = useRoom(code);
  const [toastNode, toast] = useToast();
  const [menu, setMenu] = useState(false);
  const { view } = room;

  const act: typeof room.act = async (a) => {
    const err = await room.act(a);
    if (err && err !== 'unauthorized') toast(t.errors[err] ?? t.online.error);
    return err;
  };

  async function leave() {
    if (!confirm(t.lobby.leaveConfirm)) return;
    await room.act({ type: 'leave' });
    router.push('/');
  }

  if (room.status === 'loading') return <Centered><Spinner label={t.conn.connecting} /></Centered>;
  if (room.status === 'notfound') return <Message text={t.online.roomNotFound} />;
  if (room.status === 'kicked') return <Message text={t.online.kicked} />;
  if (room.status === 'left') return <Message text={t.online.left} />;
  if (room.status === 'error') return <Message text={t.online.error} retry={room.refresh} />;
  if (room.status === 'join' || !view) {
    return <JoinForm code={code} preview={room.preview} join={room.join} />;
  }

  const isHost = view.hostId === view.meId;
  const inGame = view.phase !== 'lobby' && view.game;

  return (
    <main className={`mx-auto flex min-h-dvh flex-col px-4 ${inGame ? 'max-w-[1400px] lg:px-8' : 'max-w-2xl'}`}>
      <TopBar
        onBack={leave}
        title={
          <span className="tabular text-[15px] font-normal text-fg-2">
            {inGame ? view.code : t.lobby.title}
          </span>
        }
        right={
          <>
            <ConnBadge conn={room.conn} />
            <LangToggle />
            <IconButton label={t.game.hostMenu} outlined onClick={() => setMenu(true)}>
              <MoreHorizontal size={20} />
            </IconButton>
          </>
        }
      />
      <OfflineBanner conn={room.conn} />
      {inGame ? (
        <GameScreen view={view} online={room.online} act={act} toast={toast} />
      ) : (
        <Lobby view={view} online={room.online} act={act} />
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title={t.game.hostMenu}>
        <div className="flex flex-col gap-2">
          {isHost && inGame && (
            <Button
              variant="line"
              size="lg"
              block
              icon={<Square size={16} />}
              onClick={() => {
                if (!confirm(t.lobby.leaveConfirm)) return;
                setMenu(false);
                void act({ type: 'toLobby' });
              }}
            >
              {t.game.endGame}
            </Button>
          )}
          <Button variant="danger" size="lg" block icon={<LogOut size={18} />} onClick={leave}>
            {t.lobby.leave}
          </Button>
        </div>
      </Sheet>
      {toastNode}
    </main>
  );
}

function JoinForm({
  code,
  preview,
  join,
}: {
  code: string;
  preview: { phase: string; playerCount: number; hostName: string } | null;
  join: (name: string) => Promise<void>;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setName(storage.get<string>(NICK_KEY) ?? ''), []);
  const started = preview && preview.phase !== 'lobby';

  async function submit() {
    const n = name.trim();
    if (!n) return setError(t.online.badName);
    setBusy(true);
    setError(null);
    try {
      storage.set(NICK_KEY, n);
      await join(n);
    } catch (e) {
      const c = e instanceof ApiError ? e.code : '';
      setError(
        c === 'name_taken'
          ? t.online.nameTaken
          : c === 'game_in_progress'
            ? t.online.roomStarted
            : c === 'room_full'
              ? t.online.roomFull
              : c === 'bad_name'
                ? t.online.badName
                : c === 'network'
                  ? t.errors.network
                  : t.online.error,
      );
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <TopBar back="/" title={<span className="text-[15px] font-normal text-fg-2">{t.online.join}</span>} right={<LangToggle />} />
      <section className="flex flex-col items-center gap-3 pt-8 pb-6 text-center">
        <p className="tabular text-[48px] leading-none font-light tracking-[0.18em]">{code}</p>
        {preview && (
          <p className="text-[15px] text-fg-2">
            {t.online.hostedBy(preview.hostName)} · {t.playersCount(preview.playerCount)}
          </p>
        )}
        <Avatar seed={seedFromName(name.trim() || '?')} size={96} className="mt-4" />
      </section>
      {started ? (
        <p className="rounded-tile border-2 border-line p-5 text-center text-[15px] text-fg-2">{t.online.roomStarted}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex h-16 items-center rounded-full border-2 border-line bg-raised px-6 focus-within:border-line-strong">
            <span className="sr-only">{t.online.yourName}</span>
            <input
              value={name}
              maxLength={18}
              autoFocus
              autoComplete="nickname"
              placeholder={t.online.yourName}
              onChange={(e) => setName(e.target.value)}
              className="h-full w-full bg-transparent text-center text-[20px] outline-none placeholder:text-fg-3"
            />
          </label>
          <p role="alert" className="min-h-5 text-center text-[14px] text-danger">
            {error}
          </p>
          <Button type="submit" variant="primary" size="lg" block disabled={busy || !name.trim()}>
            {busy ? t.online.joining : `${t.online.joinAs} ${name.trim() || '…'}`}
          </Button>
        </form>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">{children}</main>;
}

function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 text-fg-2">
      <span className="size-8 animate-spin rounded-full border-[3px] border-line border-t-go" aria-hidden />
      <span className="text-[14px]">{label}</span>
    </div>
  );
}

function Message({ text, retry }: { text: string; retry?: () => void }) {
  const t = useT();
  return (
    <Centered>
      <p className="max-w-[28ch] text-[20px] leading-snug">{text}</p>
      <div className="flex gap-2">
        {retry && (
          <Button variant="line" onClick={retry}>
            {t.continue}
          </Button>
        )}
        <ButtonLink href="/" variant="primary">
          {t.online.goHome}
        </ButtonLink>
      </div>
    </Centered>
  );
}
