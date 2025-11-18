import { NextRequest, NextResponse } from 'next/server';

// Returns current session user based on app_session cookie
export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get('app_session')?.value;
    if (!cookie) {
      return NextResponse.json({ error: 'Not authenticated', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    let payload: any;
    try {
      const decoded = Buffer.from(cookie, 'base64url').toString('utf8');
      payload = JSON.parse(decoded);
    } catch (e) {
      console.error('Invalid session cookie:', e);
      return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 });
    }

    if (!payload || !payload.id || !payload.role) {
      return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('AUTH ME error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
