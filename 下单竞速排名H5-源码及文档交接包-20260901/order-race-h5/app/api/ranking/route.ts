import { getRankingSnapshot } from '@/db/order-race';

export async function GET() {
  try {
    const snapshot = await getRankingSnapshot();
    return Response.json(snapshot, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('ranking_query_failed', error);
    return Response.json(
      { ok: false, code: 'RANKING_UNAVAILABLE', message: '榜单连接中断，正在自动重试' },
      { status: 503 },
    );
  }
}
