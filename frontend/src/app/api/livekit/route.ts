import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (Note: state is per serverless instance, but good for basic protection)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

export async function GET(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

    // Rate limiting check
    const now = Date.now();
    const clientLimit = rateLimitMap.get(ip);

    if (clientLimit && now < clientLimit.expiresAt) {
        if (clientLimit.count >= MAX_REQUESTS_PER_WINDOW) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
        }
        clientLimit.count += 1;
    } else {
        rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const room = req.nextUrl.searchParams.get('room');
    const username = req.nextUrl.searchParams.get('username') || 'user-' + Math.floor(Math.random() * 10000);

    if (!room) {
        return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // 10-minute hard limit on the token to save costs
    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
        ttl: '10m',
    });

    at.addGrant({ roomJoin: true, room: room });

    const token = await at.toJwt();

    // Dispatch agent to the room explicitly required for localhost, and uses fixed agentName for Cloud
    try {
        const agentDispatch = new AgentDispatchClient(livekitUrl, apiKey, apiSecret);
        await agentDispatch.createDispatch(room, 'calendar-assistant');
        console.log(`Agent dispatched to room: ${room}`);
    } catch (e) {
        console.error('Failed to dispatch agent:', e);
        // Don't fail the request, user can still join
    }

    return NextResponse.json({ token });
}
