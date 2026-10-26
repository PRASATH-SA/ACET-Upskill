import { useState } from 'react';
import { Play, VideoOff } from 'lucide-react';
import { useAuthFile } from '../../../hooks/useAuthFile';
import { useUi } from '../../../lib/uiStore';
import { Button, Skeleton } from '../../../components/ui';

/** YouTube id from watch, youtu.be, embed or shorts URLs; null for other hosts. */
export function youTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/);
      return m ? m[2] : null;
    }
  } catch {
    return null;
  }
  return null;
}

function Poster({ title, thumb, onPlay, note }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-navy text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/50"
      aria-label={`Play video: ${title}`}
    >
      {thumb && (
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          loading="lazy"
        />
      )}
      <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-cta group-hover:scale-105">
        <Play className="h-7 w-7 translate-x-0.5" aria-hidden />
      </span>
      {note && (
        <span className="absolute bottom-3 left-3 rounded-full bg-navy/80 px-3 py-1 text-xs">
          {note}
        </span>
      )}
    </button>
  );
}

function UploadedVideo({ fileUrl, mimeType, title }) {
  const file = useAuthFile(fileUrl);
  if (file.loading || (!file.src && !file.error))
    return <Skeleton className="aspect-video w-full rounded-2xl" />;
  if (file.error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-surface text-sm">
        <VideoOff className="mr-2 h-5 w-5" aria-hidden /> The video could not be loaded.
      </div>
    );
  }
  return (
    <video controls autoPlay className="aspect-video w-full rounded-2xl bg-navy" aria-label={title}>
      <source src={file.src} type={mimeType} />
    </video>
  );
}

/**
 * Lazy video (F4): nothing heavy loads until the student taps. In low-data mode even the
 * YouTube thumbnail is skipped.
 */
export function VideoPlayer({ video }) {
  const lowData = useUi((s) => s.lowData);
  const [playing, setPlaying] = useState(false);
  const title = video.title ?? 'Topic video';
  const yt = youTubeId(video.url);

  if (!playing) {
    return (
      <Poster
        title={title}
        thumb={yt && !lowData ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null}
        note={lowData ? 'Low-data mode: loads only when you tap' : null}
        onPlay={() => setPlaying(true)}
      />
    );
  }
  if (video.fileUrl)
    return <UploadedVideo fileUrl={video.fileUrl} mimeType={video.mimeType} title={title} />;
  if (yt) {
    return (
      <iframe
        className="aspect-video w-full rounded-2xl"
        src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <div className="rounded-2xl border border-line p-4 text-sm">
      This video is hosted elsewhere.{' '}
      <Button
        as="a"
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        variant="secondary"
      >
        Open video
      </Button>
    </div>
  );
}
