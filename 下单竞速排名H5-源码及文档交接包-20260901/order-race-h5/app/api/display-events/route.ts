import { getDisplayEvents } from '@/db/order-race';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawAfter = Number(url.searchParams.get('after') ?? 0);
    const after = Number.isSafeInteger(rawAfter) && rawAfter >= 0 ? rawAfter : 0;
    const result = await getDisplayEvents(after);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('display_events_query_failed', error);
    return Response.json(
      { ok: false, code: 'DISPLAY_EVENTS_UNAVAILABLE', message: '大屏动效事件连接中断，正在自动重试' },
      { status: 503 },
    );
  }
}
