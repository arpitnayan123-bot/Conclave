"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUp,
  Bookmark,
  CircleUserRound,
  Handshake,
  Lightbulb,
  Loader2,
  LogOut,
  Rss,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useMemberStore, type Me } from "@/lib/store";
import { Logo } from "@/components/shared/Logo";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Idea, IdeasPayload, TabKey } from "./types";
import { firstName } from "./common";
import LoginGate from "./LoginGate";
import Notifications from "./Notifications";
import CommandPalette from "./CommandPalette";
import MemberProfileDialog from "./MemberProfileDialog";
import Feed from "./Feed";
import Directory from "./Directory";
import MyIdeas from "./MyIdeas";
import Requests from "./Requests";
import ProfileTab from "./ProfileTab";

const TABS: { key: TabKey; label: string; short?: string; icon: LucideIcon }[] = [
  { key: "feed", label: "The Room", short: "Room", icon: Rss },
  { key: "saved", label: "Saved", icon: Bookmark },
  { key: "directory", label: "Members", icon: Users },
  { key: "myideas", label: "My Ventures", short: "Ventures", icon: Lightbulb },
  { key: "requests", label: "Introductions", short: "Intros", icon: Handshake },
  { key: "profile", label: "Profile", icon: CircleUserRound },
];

export default function PlatformView({ initialIdeaId }: { initialIdeaId?: string | null }) {
  const token = useMemberStore((s) => s.token);
  const member = useMemberStore((s) => s.member);
  const setMember = useMemberStore((s) => s.setMember);
  const clear = useMemberStore((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const verifiedRef = useRef(false);

  const [tab, setTab] = useState<TabKey>("feed");
  const [postOpen, setPostOpen] = useState(false);
  // idea to auto-open on the feed (notification deep-links / ?idea= permalink)
  const [focusIdeaId, setFocusIdeaId] = useState<string | null>(null);
  // permalink consumed once per mount
  const permalinkUsedRef = useRef(false);

  // ⌘K command palette + profiles opened straight from the palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMemberId, setPaletteMemberId] = useState<string | null>(null);

  // ideas payload shared by Feed + My Ideas
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [meId, setMeId] = useState("");
  const [ideasLoading, setIdeasLoading] = useState(true);
  const initialIdeasTokenRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // verify the persisted session on mount; on 401 drop back to the login gate
  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      setChecking(false);
      return;
    }
    if (verifiedRef.current) {
      setChecking(false);
      return;
    }
    verifiedRef.current = true;
    api<{ member: Me }>("/members/me")
      .then((res) => setMember(res.member))
      .catch(() => {
        verifiedRef.current = false;
        clear();
        toast.error("Session expired — please sign in again.");
      })
      .finally(() => setChecking(false));
  }, [mounted, token, setMember, clear]);

  const ready = mounted && !checking && Boolean(token && member);

  const loadIdeas = useCallback(async (silent = false) => {
    if (!silent) setIdeasLoading(true);
    try {
      const data = await api<IdeasPayload>("/ideas");
      setIdeas(data.ideas);
      setMeId(data.meId);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      if (!silent) setIdeasLoading(false);
    }
  }, []);

  // shared permalink (#/platform?idea=ID): open that idea's detail dialog once ideas are around
  useEffect(() => {
    if (!initialIdeaId || !ready || ideas.length === 0) return;
    if (permalinkUsedRef.current) return;
    permalinkUsedRef.current = true;
    if (ideas.some((i) => i.id === initialIdeaId)) {
      setTab("feed");
      setFocusIdeaId(initialIdeaId);
    } else {
      toast.error("That venture is no longer in the room.");
    }
  }, [initialIdeaId, ready, ideas]);

  // initial load once per session-token, then a silent refresh when My Ideas opens
  useEffect(() => {
    if (!ready) return;
    if (initialIdeasTokenRef.current !== token) {
      initialIdeasTokenRef.current = token;
      void loadIdeas();
      return;
    }
    if (tab === "myideas") void loadIdeas(true);
  }, [ready, token, tab, loadIdeas]);

  /* ---------- cross-tab actions ---------- */

  const prependIdea = useCallback((idea: Idea) => {
    setIdeas((prev) => [idea, ...prev]);
  }, []);

  const addInterest = useCallback((ideaId: string, message: string) => {
    const m = useMemberStore.getState().member;
    if (!m) return;
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === ideaId
          ? {
              ...i,
              interests: [
                {
                  id: `local-${m.id}-${Date.now()}`,
                  message,
                  member: { id: m.id, name: m.name, college: m.college },
                },
                ...i.interests,
              ],
            }
          : i
      )
    );
  }, []);

  const removeInterest = useCallback((ideaId: string) => {
    const m = useMemberStore.getState().member;
    if (!m) return;
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === ideaId
          ? { ...i, interests: i.interests.filter((x) => x.member.id !== m.id) }
          : i
      )
    );
  }, []);

  const updateIdea = useCallback((updated: Idea) => {
    setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }, []);

  const deleteIdea = useCallback((ideaId: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
  }, []);

  // comment thread loaded/posted/deleted inside the detail dialog → sync card chip
  const setCommentCount = useCallback((ideaId: string, commentCount: number) => {
    setIdeas((prev) =>
      prev.map((i) => (i.id === ideaId && i.commentCount !== commentCount ? { ...i, commentCount } : i))
    );
  }, []);

  // save-for-later flips (optimistic updates land here from the Feed)
  const setBookmarked = useCallback((ideaId: string, bookmarked: boolean) => {
    setIdeas((prev) => prev.map((i) => (i.id === ideaId ? { ...i, bookmarked } : i)));
  }, []);

  const clearFocusIdea = useCallback(() => setFocusIdeaId(null), []);

  function openPostIdea() {
    setTab("feed");
    setPostOpen(true);
  }

  // notification → tab switch (+ optional idea to open on the feed)
  const handleNavigate = useCallback((t: TabKey, ideaId?: string) => {
    setTab(t);
    if (ideaId) setFocusIdeaId(ideaId);
  }, []);

  function logout() {
    clear();
    verifiedRef.current = false;
    initialIdeasTokenRef.current = null;
    permalinkUsedRef.current = false;
    setTab("feed");
    setPostOpen(false);
    setFocusIdeaId(null);
    setPaletteOpen(false);
    setPaletteMemberId(null);
    setIdeas([]);
    toast.success("Signed out — until next time.");
  }

  /* ---------- gates ---------- */

  if (!mounted || checking) return <Splash />;
  if (!token) return <LoginGate />;

  /* ---------- shell ---------- */

  return (
    <div className="flex min-h-svh overflow-x-clip flex-col">
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <div className="hidden shrink-0 sm:block">
            <Logo />
          </div>
          <div className="shrink-0 sm:hidden">
            <Logo compact />
          </div>

          {/* laptop (1024–1279): single row, short labels — full labels need xl room */}
          <nav className="hidden min-w-0 flex-1 lg:flex xl:flex-none" aria-label="Platform sections">
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-16 shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <t.icon className="h-4 w-4" aria-hidden />
                    <span className="xl:hidden">{t.short ?? t.label}</span>
                    <span className="hidden xl:inline">{t.label}</span>
                    {active ? (
                      <motion.span
                        layoutId="platform-tab-underline"
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* phone: current section title (full tab bar lives at the bottom) */}
          <div className="min-w-0 flex-1 md:hidden">
            <p className="flex items-center gap-2 text-sm font-semibold" aria-live="polite">
              {(() => {
                const current = TABS.find((t) => t.key === tab);
                return current ? (
                  <>
                    <current.icon className="h-4 w-4 text-primary" aria-hidden />
                    {current.label}
                  </>
                ) : null;
              })()}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette (Command K)"
              title="Search everything — ⌘K"
              className="group flex h-9 items-center gap-2 rounded-full border border-border/60 bg-card/40 pl-2.5 pr-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Search className="h-4 w-4" aria-hidden />
              <kbd className="kbd hidden text-[10px] xl:inline-flex">⌘K</kbd>
            </button>
            <Notifications onNavigate={handleNavigate} />
            {member ? (
              <div className="flex min-w-0 items-center gap-2" title={member.email}>
                <Avatar name={member.name} size="sm" />
                <span className="hidden max-w-[110px] truncate text-sm font-medium lg:block">
                  {firstName(member.name)}
                </span>
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Sign out"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* tablet (768–1023): full-width tab strip on its own row — every tab always visible */}
        <nav
          aria-label="Platform sections"
          className="hidden border-t border-border/40 lg:hidden md:block"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center gap-0.5 overflow-x-auto px-3 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-[13px] font-medium transition-colors sm:px-3.5",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="h-4 w-4" aria-hidden />
                  {t.short ?? t.label}
                  {active ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 sm:px-6 md:pb-8">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {tab === "feed" ? (
            <Feed
              ideas={ideas}
              meId={meId}
              loading={ideasLoading}
              onCreated={prependIdea}
              onInterestAdded={addInterest}
              onInterestRemoved={removeInterest}
              postOpen={postOpen}
              onPostOpenChange={setPostOpen}
              onIdeaUpdated={updateIdea}
              onIdeaDeleted={deleteIdea}
              onCountChange={setCommentCount}
              openIdeaId={focusIdeaId}
              onIdeaOpened={clearFocusIdea}
              onBookmarked={setBookmarked}
            />
          ) : null}
          {tab === "saved" ? (
            <Feed
              key="saved"
              ideas={ideas.filter((i) => i.bookmarked)}
              meId={meId}
              loading={ideasLoading}
              onCreated={prependIdea}
              onInterestAdded={addInterest}
              onInterestRemoved={removeInterest}
              postOpen={false}
              onPostOpenChange={() => {}}
              onIdeaUpdated={updateIdea}
              onIdeaDeleted={deleteIdea}
              onCountChange={setCommentCount}
              openIdeaId={null}
              onIdeaOpened={() => {}}
              onBookmarked={setBookmarked}
              savedOnly
            />
          ) : null}
          {tab === "directory" ? <Directory /> : null}
          {tab === "myideas" ? (
            <MyIdeas
              ideas={ideas}
              meId={meId}
              loading={ideasLoading}
              onPostIdea={openPostIdea}
              onBrowseFeed={() => setTab("feed")}
              onIdeaUpdated={updateIdea}
              onIdeaDeleted={deleteIdea}
            />
          ) : null}
          {tab === "requests" ? <Requests /> : null}
          {tab === "profile" ? <ProfileTab /> : null}
        </motion.div>
      </main>

      <ScrollTopButton />

      {/* ⌘K command palette (ideas + founders + actions) */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        ideas={ideas}
        meId={meId}
        onNavigate={setTab}
        onOpenIdea={(ideaId) => {
          setTab("feed");
          setFocusIdeaId(ideaId);
        }}
        onOpenMember={setPaletteMemberId}
        onPostIdea={openPostIdea}
        onLogout={logout}
      />
      {/* member profile opened directly from the palette */}
      <MemberProfileDialog
        memberId={paletteMemberId}
        onClose={() => setPaletteMemberId(null)}
      />

      {/* mobile bottom tab bar — app-like navigation */}
      <nav
        aria-label="Platform sections"
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border/60 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-6">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative grid h-8 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-primary/15"
                  )}
                >
                  <t.icon className="h-[18px] w-[18px]" aria-hidden />
                  {active ? (
                    <motion.span
                      layoutId="platform-mobile-tab-glow"
                      className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_16px_-2px_var(--primary)]"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                </span>
                <span className="text-[10px] font-medium leading-none">{t.short ?? t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ---------- scroll-to-top FAB ---------- */

function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.button
      type="button"
      initial={false}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.6, y: visible ? 0 : 12 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className="glow-emerald fixed bottom-20 right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-primary/40 bg-primary/15 text-primary backdrop-blur-md transition-colors hover:bg-primary/25 md:bottom-5"
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </motion.button>
  );
}

/* ---------- auth splash ---------- */

function Splash() {
  return (
    <div className="flex min-h-svh overflow-x-clip flex-col items-center justify-center gap-5">
      <Logo />
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Checking your session…</span>
    </div>
  );
}
