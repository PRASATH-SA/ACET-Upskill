/** Server-Sent Events helpers (A.3 streaming). */

/** Starts an SSE response and returns { send, comment, close, closed }. */
export function openSse(req, res) {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // nginx: don't buffer the stream (H1 reverse proxy).
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  let closed = false;
  const onClose = () => {
    closed = true;
  };
  // The response closes when the client disconnects or we end the stream.
  res.on('close', onClose);
  return {
    send(event, data) {
      if (closed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    comment(text = 'keep-alive') {
      if (!closed) res.write(`: ${text}\n\n`);
    },
    close() {
      if (!closed) {
        closed = true;
        res.end();
      }
    },
    get closed() {
      return closed;
    },
  };
}
