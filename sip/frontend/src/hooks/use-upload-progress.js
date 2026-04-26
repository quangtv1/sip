/**
 * Hook for consuming SSE upload progress events.
 * Opens an EventSource to the given SSE URL and returns the latest progress state.
 *
 * Usage:
 *   const { step, progress, detail, summary, error, done } = useUploadProgress(url);
 *   url: full URL of the SSE endpoint (pass null to disable)
 */
import { useState, useEffect, useRef } from 'react';

export default function useUploadProgress(url) {
  const [state, setState] = useState({
    step: null,
    progress: 0,
    detail: null,
    summary: null,
    error: null,
    done: false,
  });
  const esRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    const token = localStorage.getItem('sip_token');
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    const es = new EventSource(fullUrl);
    esRef.current = es;

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setState({
          step: data.step,
          progress: data.progress ?? 0,
          detail: data.detail ?? null,
          summary: data.summary ?? null,
          error: data.error ?? null,
          done: data.step === 'complete' || data.step === 'error',
        });
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, error: 'Mất kết nối SSE', done: true }));
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [url]);

  function reset() {
    setState({ step: null, progress: 0, detail: null, summary: null, error: null, done: false });
  }

  return { ...state, reset };
}
