import { useEffect, useRef, useState } from 'react';
import { getFontEmbedCSS, toPng } from 'html-to-image';
import { Download, Expand, FileText, ImageOff, Printer, Share2 } from 'lucide-react';
import { THEME_COLORS, cheatPoster, themeCssVars } from '@acet/shared';
import { Button, Dialog, Skeleton } from '../../../components/ui';
import { CheatSheet } from './CheatSheet';
import { CheatSheetPoster } from './CheatSheetPoster';

/** The poster always uses the light palette, so a saved or shared image looks the same for all. */
const LIGHT = { ...themeCssVars(THEME_COLORS.light), colorScheme: 'light' };
/** Images already drawn this session, by sheet content: switching tabs does not redraw. */
const drawn = new Map();

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * The page's web fonts as embeddable CSS, fetched once per session: embedding them is the slow
 * part of a draw. Null when they cannot be read (offline, blocked CDN): the poster then draws
 * with the fallback font.
 */
let fontCss = null;
const embeddedFonts = (node) => {
  fontCss ??= getFontEmbedCSS(node).catch(() => null);
  return fontCss;
};

async function draw(node) {
  if (document.fonts?.ready) await document.fonts.ready;
  const css = await embeddedFonts(node);
  const options = { pixelRatio: 2, backgroundColor: '#ffffff' };
  return toPng(node, css ? { ...options, fontEmbedCSS: css } : { ...options, skipFonts: true });
}

const dataUrlToFile = async (url, name) =>
  new File([await (await fetch(url)).blob()], name, { type: 'image/png' });

/**
 * The cheat sheet as a picture (ADR 0016): the 3:2 study poster (CheatSheetPoster) is drawn off-screen
 * and turned into a PNG in the browser, so every topic gets an image built from its published
 * notes, with nothing stored. Students can zoom, download, share or print it; "Text version"
 * shows the same sheet as readable text (screen readers, copying).
 */
export function CheatSheetImage({ sheet, onPrint }) {
  const key = JSON.stringify(sheet);
  const posterRef = useRef(null);
  // The image is read from the cache, so the poster is mounted in the same render that draws it.
  const [, redraw] = useState(0);
  const image = drawn.get(key) ?? null;
  const [failedKey, setFailedKey] = useState(null);
  const failed = failedKey === key;
  const [asText, setAsText] = useState(false);
  const [zoom, setZoom] = useState(false);
  const fileName = `${slug(`${sheet.subject.code ?? ''} ${sheet.title}`)}-cheat-sheet.png`;
  const alt = `Cheat sheet for ${sheet.title}${sheet.bigIdea ? `: ${sheet.bigIdea}` : ''}`;

  useEffect(() => {
    if (drawn.has(key) || failedKey === key) return undefined;
    let live = true;
    // Wait a frame so the off-screen poster has laid out before it is measured.
    const frame = requestAnimationFrame(() => {
      if (!posterRef.current) return;
      draw(posterRef.current)
        .then((url) => {
          drawn.set(key, url);
          if (live) redraw((n) => n + 1);
        })
        .catch(() => live && setFailedKey(key));
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [key, failedKey]);

  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';
  const share = async () => {
    try {
      const file = await dataUrlToFile(image, fileName);
      if (!navigator.canShare({ files: [file] })) throw new Error('unsupported');
      await navigator.share({ files: [file], title: `${sheet.title} cheat sheet` });
    } catch {
      // Cancelled, or this browser cannot share files: downloading still works.
    }
  };

  const showText = asText || failed;
  return (
    <div>
      {!image && !failed && (
        <div
          aria-hidden
          inert=""
          className="cheat-poster pointer-events-none fixed left-[-10000px] top-0"
          style={LIGHT}
        >
          <div ref={posterRef}>
            <CheatSheetPoster poster={cheatPoster(sheet)} />
          </div>
        </div>
      )}

      <div className="no-print flex flex-wrap items-center gap-2">
        {image && !asText && (
          <>
            <Button
              as="a"
              href={image}
              download={fileName}
              size="sm"
              icon={Download}
              className="hover:no-underline"
            >
              Download image
            </Button>
            {canShare && (
              <Button variant="secondary" size="sm" icon={Share2} onClick={share}>
                Share
              </Button>
            )}
          </>
        )}
        {onPrint && (image || showText) && (
          <Button variant="secondary" size="sm" icon={Printer} onClick={onPrint}>
            Print
          </Button>
        )}
        {!failed && (
          <Button
            variant="ghost"
            size="sm"
            icon={FileText}
            aria-pressed={asText}
            onClick={() => setAsText((v) => !v)}
          >
            Text version
          </Button>
        )}
      </div>

      <div className="mt-4">
        {showText ? (
          <>
            {failed && (
              <p className="no-print mb-3 flex items-center gap-2 text-sm">
                <ImageOff className="h-4 w-4" aria-hidden /> The image could not be drawn on this
                device, so here is the same sheet as text.
              </p>
            )}
            <CheatSheet sheet={sheet} />
          </>
        ) : image ? (
          <figure id="cheat-sheet" className="cheat-sheet">
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="group relative block w-full overflow-hidden rounded-card border border-line bg-white"
              aria-label={`Enlarge the ${sheet.title} cheat sheet`}
            >
              <img src={image} alt={alt} className="block w-full" />
              <span className="no-print absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-navy/80 text-white opacity-90 transition group-hover:opacity-100">
                <Expand className="h-4 w-4" aria-hidden />
              </span>
            </button>
          </figure>
        ) : (
          <div role="status" aria-label="Drawing the cheat sheet">
            <Skeleton className="aspect-[4/3] w-full rounded-card" />
          </div>
        )}
      </div>

      <Dialog
        open={zoom}
        onClose={() => setZoom(false)}
        title={`${sheet.title} · cheat sheet`}
        size="xl"
      >
        <div className="overflow-x-auto">
          <img src={image ?? undefined} alt={alt} className="block w-full min-w-[900px]" />
        </div>
      </Dialog>
    </div>
  );
}
