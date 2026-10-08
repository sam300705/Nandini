import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookHeart, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { loadFriendshipPages, type FriendshipPage } from "@/lib/friendshipLetter";
import "./friendship-letter.css";

type Props = { onBack: () => void };
type LoadState = "loading" | "ready" | "empty" | "error";

function HandwrittenParagraph({ text }: { text: string }) {
  // These limited marker tokens create colored highlighter strokes, not HTML.
  const parts = text.split(/(\[\[(?:pink|blue|mint|yellow):[^\]]{1,100}\]\])/g);
  return (
    <p>
      {parts.map((part, index) => {
        const marker = /^\[\[(pink|blue|mint|yellow):([^\]]{1,100})\]\]$/.exec(part);
        return marker ? (
          <span key={index} className={"friendship-highlight friendship-highlight-" + marker[1]}>
            {marker[2]}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </p>
  );
}

export default function FriendshipLetter({ onBack }: Props) {
  const { session } = useAuth();
  const ownerId = session?.user.id;
  const [pages, setPages] = useState<FriendshipPage[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [index, setIndex] = useState(0);
  const [retry, setRetry] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    if (!ownerId) return;
    setStatus("loading");
    void loadFriendshipPages(ownerId).then((loaded) => {
      if (!active) return;
      setPages(loaded);
      setIndex(0);
      setStatus(loaded.length === 3 ? "ready" : "empty");
    }).catch(() => {
      if (active) setStatus("error");
    });
    return () => { active = false; };
  }, [ownerId, retry]);

  const move = (delta: number) => {
    setIndex((current) => Math.min(Math.max(current + delta, 0), Math.max(pages.length - 1, 0)));
  };
  const page = pages[index];

  return (
    <section className="friendship-letter" aria-label="Friendship letter for Nandini">
      <button type="button" className="friendship-back" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" /> Back to home
      </button>

      <header className="friendship-intro">
        <div className="friendship-seal" aria-hidden="true"><BookHeart size={25} /></div>
        <p className="friendship-eyebrow">A little something, just for you</p>
        <h2>Dear Nandini <Heart aria-hidden="true" size={23} fill="currentColor" /></h2>
        <p>A note about the friendship that began at Dronacharya.</p>
      </header>

      {status === "loading" && (
        <div className="friendship-message" role="status">Opening your little notebook… ♡</div>
      )}
      {status === "empty" && (
        <div className="friendship-message" role="status">
          <BookHeart size={28} aria-hidden="true" />
          <p>This letter is being kept safe until it's ready for you. 💌</p>
        </div>
      )}
      {status === "error" && (
        <div className="friendship-message" role="alert">
          <p>We couldn't open the letter just now.</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>
        </div>
      )}
      {status === "ready" && page && (
        <>
          <div className="friendship-book-shell">
            <article
              key={page.page_number}
              className="friendship-paper"
              aria-label={"Notebook page " + page.page_number}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  move(event.key === "ArrowRight" ? 1 : -1);
                }
              }}
              onTouchStart={(event) => {
                if (event.touches.length !== 1) { touch.current = null; return; }
                touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
              }}
              onTouchCancel={() => { touch.current = null; }}
              onTouchEnd={(event) => {
                const start = touch.current;
                touch.current = null;
                if (!start || event.changedTouches.length !== 1) return;
                const dx = event.changedTouches[0].clientX - start.x;
                const dy = event.changedTouches[0].clientY - start.y;
                if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
              }}
            >
              <div className="friendship-page-decor" aria-hidden="true">✿ ♡ ✿</div>
              <div className="friendship-ribbon">Just for you ♡</div>
              <div className="friendship-page-caption">A friendship worth keeping · page {page.page_number}</div>
              <h3>{page.heading}</h3>
              <div className="friendship-writing">
                {page.paragraphs.map((paragraph, paragraphIndex) => (
                  <HandwrittenParagraph key={paragraphIndex} text={paragraph} />
                ))}
              </div>
              {page.page_number === 3 && <p className="friendship-signature">— Your friend, Sambhav ♡</p>}
              <span className="friendship-page-number">~ {page.page_number} ~</span>
            </article>
          </div>
          <p className="friendship-hint">Swipe the paper or use ← → to turn the page.</p>
          <nav className="friendship-pagination" aria-label="Letter pages">
            <button type="button" aria-label="Previous page" disabled={index === 0} onClick={() => move(-1)}>
              <ChevronLeft size={19} /> Previous
            </button>
            <span role="status" aria-live="polite">Page {index + 1} of {pages.length}</span>
            <button type="button" aria-label="Next page" disabled={index === pages.length - 1} onClick={() => move(1)}>
              Next <ChevronRight size={19} />
            </button>
          </nav>
          {index === pages.length - 1 && (
            <p className="friendship-ending">Some friendships begin in college, but last far beyond it. <ArrowRight size={16} aria-hidden="true" /></p>
          )}
        </>
      )}
    </section>
  );
}
