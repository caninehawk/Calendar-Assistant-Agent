import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
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

    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
        ttl: '10m',
    });

    at.addGrant({ roomJoin: true, room: room });

    const token = await at.toJwt();

    // Dispatch agent to the room
    try {
        const agentDispatch = new AgentDispatchClient(livekitUrl, apiKey, apiSecret);
        await agentDispatch.createDispatch(room, '');
        console.log(`Agent dispatched to room: ${room}`);
    } catch (e) {
        console.error('Failed to dispatch agent:', e);
        // Don't fail the request, user can still join
    }

    return NextResponse.json({ token });
}
