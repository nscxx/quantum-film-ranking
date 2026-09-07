import { triggerBigCustomerCelebration } from '@/db/order-race';
import { hasValidControlSession } from '@/lib/order-race/auth';

export async function POST(request: Request) {
  if (!(await hasValidControlSession(request))) {
    return Response.json({ ok: false, code: 'UNAUTHORIZED', message: '后台登录已失效，请重新登录' }, { status: 401 });
  }
  try {
    const event = await triggerBigCustomerCelebration();
    return Response.json({ ok: true, eventId: event.id, createdAt: event.createdAt });
  } catch (error) {
    console.error('big_customer_celebration_failed', error);
    return Response.json({ ok: false, code: 'BIG_CUSTOMER_EVENT_FAILED', message: '特效发送失败，请稍后重试' }, { status: 503 });
  }
}
