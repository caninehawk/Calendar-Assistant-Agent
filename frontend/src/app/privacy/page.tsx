export default function PrivacyPolicy() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#0e0618',
            color: '#f0eeff',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '60px 24px',
            maxWidth: 720,
            margin: '0 auto',
            lineHeight: 1.75,
        }}>
            <a href="/" style={{ color: '#a855f7', fontSize: '0.85rem', textDecoration: 'none' }}>← Back</a>

            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
            <p style={{ color: 'rgba(240,238,255,0.45)', fontSize: '0.85rem', marginBottom: 40 }}>
                Last updated: March 2026
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>What this app does</h2>
            <p style={{ marginBottom: 28, color: 'rgba(240,238,255,0.75)' }}>
                Calendar Agent is a voice-powered assistant that lets you interact with your Google Calendar using your
                voice. You can ask it to list upcoming events, schedule new ones, or delete existing ones.
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>Data we access</h2>
            <p style={{ marginBottom: 12, color: 'rgba(240,238,255,0.75)' }}>
                When you sign in, we request access to:
            </p>
            <ul style={{ paddingLeft: 20, marginBottom: 28, color: 'rgba(240,238,255,0.75)' }}>
                <li>Your Google account profile (name and email)</li>
                <li>Your Google Calendar — to read, create, and delete events on your behalf</li>
            </ul>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>How we use your data</h2>
            <ul style={{ paddingLeft: 20, marginBottom: 28, color: 'rgba(240,238,255,0.75)' }}>
                <li>Your Google access token is used only during your active session to perform calendar actions you request via voice.</li>
                <li>We do not store your access token or any calendar data on our servers after your session ends.</li>
                <li>We do not sell, share, or transfer your data to any third party.</li>
            </ul>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>Third-party services</h2>
            <p style={{ marginBottom: 28, color: 'rgba(240,238,255,0.75)' }}>
                This app uses LiveKit for real-time audio communication. Voice audio is processed in real time and is
                not recorded or stored. AI inference (speech recognition, language model, text-to-speech) is handled
                via LiveKit&apos;s managed inference infrastructure.
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>Contact</h2>
            <p style={{ color: 'rgba(240,238,255,0.75)' }}>
                For questions about this privacy policy, contact the developer at{' '}
                <a href="mailto:sandeepskatna@gmail.com" style={{ color: '#a855f7' }}>sandeepskatna@gmail.com</a>.
            </p>
        </div>
    );
}
