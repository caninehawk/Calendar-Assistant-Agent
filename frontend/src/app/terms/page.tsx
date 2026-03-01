export default function Terms() {
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

            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Terms of Service</h1>
            <p style={{ color: 'rgba(240,238,255,0.45)', fontSize: '0.85rem', marginBottom: 40 }}>
                Last updated: March 2026
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>Using this app</h2>
            <p style={{ marginBottom: 28, color: 'rgba(240,238,255,0.75)' }}>
                Calendar Agent is a personal productivity tool. By using this app, you agree to use it only for lawful
                purposes and in accordance with Google&apos;s Terms of Service.
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>Google account access</h2>
            <p style={{ marginBottom: 28, color: 'rgba(240,238,255,0.75)' }}>
                You grant this app limited access to your Google Calendar solely to perform actions you explicitly
                request during your session. You can revoke access at any time from your{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" style={{ color: '#a855f7' }}>
                    Google Account permissions page
                </a>.
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>No warranty</h2>
            <p style={{ marginBottom: 28, color: 'rgba(240,238,255,0.75)' }}>
                This app is provided as-is. The developer is not liable for any incorrect calendar changes made through
                the app. Always verify important events in Google Calendar directly.
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>Contact</h2>
            <p style={{ color: 'rgba(240,238,255,0.75)' }}>
                Questions? Reach out at{' '}
                <a href="mailto:sandeepskatna@gmail.com" style={{ color: '#a855f7' }}>sandeepskatna@gmail.com</a>.
            </p>
        </div>
    );
}
