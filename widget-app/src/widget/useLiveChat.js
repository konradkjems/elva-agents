import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pollLiveChat } from '../lib/api';

/**
 * Human handoff transport.
 *
 * SSE (/api/live-chat/stream) first, 2.5s polling as fallback. The stream
 * replays recent messages on every (re)connect, and Vercel cuts it at the
 * function's maxDuration, so everything is de-duplicated by message id and
 * only agent/system messages are surfaced (visitor and AI messages are
 * already on screen; v1 showed them twice).
 */
export function useLiveChat({ conversationId, initial, onMessage, onJoined }) {
  const [status, setStatus] = useState(initial?.status === 'requested' || initial?.status === 'active' ? initial.status : 'ai');
  const [agentInfo, setAgentInfo] = useState(initial?.agentInfo || null);

  const seen = useRef(new Set());
  const esRef = useRef(null);
  const pollRef = useRef(null);
  const lastIdRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const cbRef = useRef({ onMessage, onJoined });
  cbRef.current = { onMessage, onJoined };
  const convRef = useRef(conversationId);
  convRef.current = conversationId;

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const handleStatus = useCallback(
    (next, agent) => {
      const prev = statusRef.current;
      if (next === 'ended' || next === 'ai') {
        statusRef.current = 'ai';
        setStatus('ai');
        setAgentInfo(null);
        stop();
        return;
      }
      if (next !== 'requested' && next !== 'active') return;
      statusRef.current = next;
      setStatus(next);
      if (agent) setAgentInfo(agent);
      if (next === 'active' && prev === 'requested') cbRef.current.onJoined?.(agent);
    },
    [stop]
  );

  const handleMessage = useCallback((m) => {
    if (!m || !m.id || seen.current.has(m.id)) return;
    seen.current.add(m.id);
    const type = m.type || m.role;
    if (type === 'agent' || type === 'system') cbRef.current.onMessage?.(m);
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current || !convRef.current) return;
    const tick = async () => {
      if (!convRef.current) return;
      try {
        const data = await pollLiveChat(convRef.current, lastIdRef.current);
        (data.newMessages || []).forEach(handleMessage);
        if (data.lastMessageId) lastIdRef.current = data.lastMessageId;
        handleStatus(data.status, data.agentInfo);
      } catch {
        /* transient; next tick retries */
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2500);
  }, [handleMessage, handleStatus]);

  const connect = useCallback(() => {
    const id = convRef.current;
    if (!id || esRef.current || pollRef.current) return;
    if (typeof EventSource === 'undefined') return startPolling();
    let opened = false;
    const es = new EventSource(`/api/live-chat/stream?conversationId=${encodeURIComponent(id)}`);
    esRef.current = es;
    const fallback = setTimeout(() => {
      if (!opened) {
        es.close();
        esRef.current = null;
        startPolling();
      }
    }, 4000);
    es.onopen = () => {
      opened = true;
      clearTimeout(fallback);
    };
    es.onmessage = (e) => {
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.type === 'status') handleStatus(data.status, data.agentInfo);
      else if (data.type === 'message') handleMessage(data.message);
    };
    es.onerror = () => {
      // CONNECTING = the browser is reconnecting after the server cut the
      // stream (expected every maxDuration). CLOSED = give up and poll.
      if (es.readyState === EventSource.CLOSED) {
        clearTimeout(fallback);
        esRef.current = null;
        startPolling();
      }
    };
  }, [handleMessage, handleStatus, startPolling]);

  // Whenever a conversation becomes current (restored session, loaded from
  // history), ask once whether a handoff is pending or running.
  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    pollLiveChat(conversationId)
      .then((data) => {
        if (cancelled) return;
        (data.newMessages || []).forEach((m) => m?.id && seen.current.add(m.id));
        if (data.lastMessageId) lastIdRef.current = data.lastMessageId;
        if (data.status === 'requested' || data.status === 'active') {
          handleStatus(data.status, data.agentInfo);
          connect();
        } else if (statusRef.current !== 'ai') {
          handleStatus('ai');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversationId, connect, handleStatus]);

  useEffect(() => stop, [stop]);

  const begin = useCallback(
    (next, agent) => {
      handleStatus(next, agent);
      connect();
    },
    [connect, handleStatus]
  );

  const reset = useCallback(() => {
    stop();
    seen.current = new Set();
    lastIdRef.current = null;
    statusRef.current = 'ai';
    setStatus('ai');
    setAgentInfo(null);
  }, [stop]);

  const markSeen = useCallback((id) => seen.current.add(id), []);

  return useMemo(() => ({ status, agentInfo, begin, reset, markSeen }), [status, agentInfo, begin, reset, markSeen]);
}
