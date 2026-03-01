'use client';

import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
  useRoomContext,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { ParticipantKind } from 'livekit-client';
import { useRemoteParticipants } from '@livekit/components-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M19 10a7 7 0 01-14 0M12 19v3M8 22h8" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 16, height: 16,
      border: '2px solid rgba(255,255,255,0.25)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

function MainApp() {
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: (r) => { setGoogleToken(r.access_token); setError(null); },
    onError: () => setError('Sign-in failed, please try again.'),
    scope: 'https://www.googleapis.com/auth/calendar',
  });

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/livekit?room=calendar-agent-room');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setLivekitToken(data.token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-scene" />
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      {/* Nav */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f0f0f0' }}>
          <img src="/logo.png" alt="Logo" style={{
            width: 34, height: 34, borderRadius: 10,
            boxShadow: '0 0 14px rgba(160,60,220,0.3)',
            objectFit: 'cover',
          }} />
          <span style={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '0.01em' }}>
            Calendar Agent
          </span>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['Sign in', 'Connect', 'Talk'].map((label, i) => {
            const step = !googleToken ? 0 : !livekitToken ? 1 : 2;
            const active = i === step;
            const done = i < step;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: active ? 'rgba(140,60,220,0.18)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(180,100,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.3s ease',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: done || active ? '#a855f7' : 'rgba(255,255,255,0.2)',
                    boxShadow: active ? '0 0 8px rgba(168,85,247,0.8)' : 'none',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    color: active ? '#c084fc' : 'rgba(255,255,255,0.3)',
                    transition: 'color 0.3s ease',
                  }}>{label}</span>
                </div>
                {i < 2 && (
                  <div style={{
                    width: 16, height: 1,
                    background: i < step ? 'rgba(255,101,0,0.5)' : 'rgba(255,255,255,0.08)',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ width: 140 }} />
      </nav>

      {/* Content */}
      <main style={{
        flex: 1, position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 20px',
      }}>

        {/* Step 1: Sign in */}
        {!googleToken && (
          <div className="glass-card fade-up" style={{ maxWidth: 420, width: '100%', padding: '44px 36px', textAlign: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{
              width: 72, height: 72, margin: '0 auto 24px',
              borderRadius: 20,
              display: 'block',
              boxShadow: '0 0 32px rgba(180,60,220,0.45), 0 0 70px rgba(224,64,251,0.15)',
              objectFit: 'cover',
            }} />

            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: 8, color: '#fff' }}>
              Your calendar, but voice-first
            </h1>
            <p style={{ color: 'rgba(240,240,240,0.5)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 30 }}>
              Ask it what&apos;s on your schedule, book meetings, or cancel events. Just talk.
            </p>

            <div className="divider" style={{ marginBottom: 28 }} />

            <button className="btn-glass btn-primary" style={{ width: '100%', padding: '14px 20px' }} onClick={() => login()}>
              <GoogleIcon />
              Sign in with Google
            </button>

            {error && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: 14 }}>{error}</p>
            )}

            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.72rem', marginTop: 22, lineHeight: 1.6 }}>
              We only use calendar access to read and manage your events.
            </p>
          </div>
        )}

        {/* Step 2: Connect */}
        {googleToken && !livekitToken && (
          <div className="glass-card fade-up" style={{ maxWidth: 420, width: '100%', padding: '44px 36px', textAlign: 'center' }}>
            <div className="status-pill green" style={{ margin: '0 auto 26px', display: 'inline-flex' }}>
              <span className="status-dot" />
              Google connected
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8, color: '#fff' }}>
              Ready when you are ✦
            </h2>
            <p style={{ color: 'rgba(240,240,240,0.5)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 32 }}>
              Hit the button below and start talking to your calendar.
            </p>

            <div className="divider" style={{ marginBottom: 32 }} />

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <div className="mic-ring">
                <div className="mic-core">
                  <MicIcon />
                </div>
              </div>
            </div>

            <button
              className="btn-glass btn-primary"
              style={{ width: '100%', padding: '14px 20px', opacity: connecting ? 0.65 : 1 }}
              onClick={connect}
              disabled={connecting}
            >
              {connecting ? <><Spinner /> Starting up...</> : <><MicIcon size={18} /> Start voice session</>}
            </button>

            {error && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: 14 }}>{error}</p>
            )}
          </div>
        )}

        {/* Step 3: Live session */}
        {livekitToken && (
          <LiveKitRoom
            token={livekitToken}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            connect={true}
            audio={true}
            video={false}
            style={{ width: '100%', maxWidth: 500 }}
          >
            <AgentPanel googleToken={googleToken!} />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}
      </main>

      <footer style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', padding: '18px',
        color: 'rgba(255,255,255,0.1)',
        fontSize: '0.72rem',
        letterSpacing: '0.05em',
      }}>
        Calendar Voice Agent
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AgentPanel({ googleToken }: { googleToken: string }) {
  const { state, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();
  const participants = useRemoteParticipants({ room });
  const [tokenSent, setTokenSent] = useState(false);

  const stateLabels: Record<string, { text: string; color: string }> = {
    idle: { text: 'Waiting for you', color: 'rgba(240,238,255,0.45)' },
    listening: { text: 'Listening...', color: '#a78bfa' },
    thinking: { text: 'Thinking...', color: '#e040fb' },
    speaking: { text: 'Speaking', color: '#f472b6' },
    connecting: { text: 'Connecting...', color: 'rgba(240,238,255,0.3)' },
  };

  const { text, color } = stateLabels[state] ?? { text: state, color: '#f472b6' };
  const isActive = ['listening', 'thinking', 'speaking'].includes(state);

  useEffect(() => {
    if (tokenSent) return;
    const agent = participants.find(p => p.kind === ParticipantKind.AGENT || !p.isLocal);
    if (!agent) return;

    const send = async () => {
      try {
        const payload = new TextEncoder().encode(JSON.stringify({
          id: crypto.randomUUID(),
          message: `GOOGLE_TOKEN:${googleToken}`,
          timestamp: Date.now(),
        }));
        await room.localParticipant.publishData(payload, {
          reliable: true,
          topic: 'lk-chat-topic',
          destinationIdentities: [agent.identity],
        });
        setTokenSent(true);
      } catch (e) {
        console.error('Token send failed:', e);
      }
    };
    send();
  }, [participants, googleToken, room, tokenSent]);

  return (
    <div className="glass-card fade-up" style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '18px 26px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#f0f0f0', fontWeight: 600 }}>
          <img src="/logo.png" alt="Logo" style={{
            width: 30, height: 30, borderRadius: 8,
            boxShadow: '0 0 10px rgba(160,60,220,0.3)',
            objectFit: 'cover',
          }} />
          Calendar Agent
        </div>
        <div className="status-pill green">
          <span className="status-dot" />
          Live
        </div>
      </div>

      {/* Main */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 22, padding: '36px 28px',
      }}>
        <div className="mic-ring" style={{ opacity: isActive ? 1 : 0.45, transition: 'opacity 0.4s ease' }}>
          <div className="mic-core" style={{ color, transition: 'color 0.4s ease' }}>
            <MicIcon />
          </div>
        </div>

        <p style={{
          fontSize: '1rem', fontWeight: 500,
          color, transition: 'color 0.4s ease',
          textShadow: isActive ? `0 0 18px ${color}` : 'none',
          minHeight: '1.5em',
        }}>
          {text}
        </p>

        <div style={{
          width: '100%', height: 64,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          padding: '0 14px', overflow: 'hidden',
          boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset',
        }}>
          <BarVisualizer
            state={state}
            barCount={28}
            trackRef={audioTrack}
            style={{ width: '100%', height: '100%' }}
            options={{ minHeight: 3 }}
          />
        </div>

        <p style={{ color: 'rgba(240,240,240,0.35)', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6 }}>
          {tokenSent
            ? 'Ask about your schedule, book a meeting, or delete an event.'
            : 'Connecting to your calendar...'}
        </p>
      </div>

      <div style={{ padding: '14px 26px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
        <VoiceAssistantControlBar />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <MainApp />
    </GoogleOAuthProvider>
  );
}
