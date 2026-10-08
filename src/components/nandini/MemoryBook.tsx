import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/auth/useAuth";
import { loadMemoryBook, type LoadedMemoryPage } from "@/lib/memoryBook";
import "./memory-book.css";

function BookPages({ pages }: { pages: LoadedMemoryPage[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [turn, setTurn] = useState<{ from: number; to: number; direction: number } | null>(null);
  const turning = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressTapUntil = useRef(0);
  const turnPage = useCallback(
    (direction: number) => {
      const from = indexRef.current;
      const to = from + direction;
      if (turning.current || to < 0 || to >= pages.length) return;
      if (reduced) {
        indexRef.current = to;
        setIndex(to);
        return;
      }
      turning.current = true;
      setTurn({ from, to, direction });
    },
    [pages.length, reduced],
  );
  const finishTurn = () => {
    if (turn) {
      indexRef.current = turn.to;
      setIndex(turn.to);
    }
    setTurn(null);
    turning.current = false;
  };
  const current = pages[index]!;
  useEffect(() => {
    if (reduced && turn) {
      indexRef.current = turn.to;
      setIndex(turn.to);
      setTurn(null);
      turning.current = false;
    }
  }, [reduced, turn]);
  return (
    <div
      className="memory-reader"
      role="group"
      aria-label="Handwritten pages"
      tabIndex={0}
      data-motion={reduced ? "reduced" : "page-turn"}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          turnPage(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div
        className="memory-stage"
        onTouchStart={(event) => {
          if (event.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1) {
            start.current = null;
            return;
          }
          start.current = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY };
        }}
        onTouchMove={(event) => {
          if (event.touches.length !== 1) start.current = null;
        }}
        onTouchCancel={() => {
          start.current = null;
          suppressTapUntil.current = Date.now() + 400;
        }}
        onTouchEnd={(event) => {
          const point = start.current;
          start.current = null;
          if (
            !point ||
            event.changedTouches.length !== 1 ||
            (window.visualViewport?.scale ?? 1) > 1
          )
            return;
          const dx = event.changedTouches[0]!.clientX - point.x;
          const dy = event.changedTouches[0]!.clientY - point.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            suppressTapUntil.current = Date.now() + 400;
            turnPage(dx < 0 ? 1 : -1);
          }
        }}
      >
        <div className="memory-paper memory-under" aria-hidden="true" />
        <img
          className="memory-page"
          src={pages[turn && turn.direction > 0 ? turn.to : index]!.url}
          alt={pages[turn && turn.direction > 0 ? turn.to : index]!.alt}
          draggable={false}
        />
        {turn && (
          <motion.div
            key={`${turn.from}-${turn.to}`}
            className="memory-turning"
            aria-hidden="true"
            style={{ transformOrigin: "left center" }}
            initial={{ rotateY: turn.direction > 0 ? 0 : -180 }}
            animate={{ rotateY: turn.direction > 0 ? -180 : 0 }}
            transition={{ duration: 0.8, ease: [0.3, 0.08, 0.24, 1] }}
            onAnimationComplete={finishTurn}
          >
            <div className="memory-front">
              <img
                src={pages[turn.direction > 0 ? turn.from : turn.to]!.url}
                alt=""
                draggable={false}
              />
              <span className="memory-fold" />
            </div>
            <div className="memory-back" />
          </motion.div>
        )}
        <button
          type="button"
          className="memory-tap memory-left"
          aria-label="Turn to previous page"
          disabled={index === 0 || !!turn}
          onClick={() => {
            if (Date.now() > suppressTapUntil.current) turnPage(-1);
          }}
        />
        <button
          type="button"
          className="memory-tap memory-right"
          aria-label="Turn to next page"
          disabled={index === pages.length - 1 || !!turn}
          onClick={() => {
            if (Date.now() > suppressTapUntil.current) turnPage(1);
          }}
        />
      </div>
      <p className="memory-hint">Swipe, tap the edges, or use ← → to turn a page</p>
      <div className="memory-controls">
        <button
          type="button"
          aria-label="Previous page"
          disabled={index === 0 || !!turn}
          onClick={() => turnPage(-1)}
        >
          ←
        </button>
        <span role="status" aria-live="polite">
          {current.number} / {pages.length}
          {index === pages.length - 1 ? " ✨" : ""}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={index === pages.length - 1 || !!turn}
          onClick={() => turnPage(1)}
        >
          →
        </button>
      </div>
    </div>
  );
}

function PrivateBook() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [pages, setPages] = useState<LoadedMemoryPage[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    setPages(null);
    setError(false);
    if (uid)
      void loadMemoryBook(uid, controller.signal)
        .then((book) => {
          if (controller.signal.aborted) {
            book.dispose();
            return;
          }
          dispose = book.dispose;
          setPages(book.pages);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    return () => {
      controller.abort();
      dispose?.();
    };
  }, [uid, retry]);
  if (!uid) return <p role="status">Sign in to open your book.</p>;
  if (error)
    return (
      <div role="alert" className="text-center">
        <p>Pages load nahi ho paayi. Ek baar phir try karo 🙂</p>
        <button className="p-3 rounded-xl border mt-3" onClick={() => setRetry((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  if (!pages)
    return (
      <p role="status" className="text-center">
        Tumhare pages khul rahe hain… ✨
      </p>
    );
  return <BookPages pages={pages} />;
}

export default function MemoryBook() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <section className="memory-book glass-pink rounded-2xl" aria-label="Friendship Notes">
      <h2 className="text-center font-script text-2xl text-gradient">📝 Friendship Notes</h2>
      <p className="memory-intro">A few fun notes and memories from a friend.</p>
      <PrivateBook key={session.user.id} />
    </section>
  );
}
