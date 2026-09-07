import { createScoreSubmission } from '@/db/order-race';
import { hasValidControlSession } from '@/lib/order-race/auth';

export async function POST(request: Request) {
  if (!(await hasValidControlSession(request))) {
    return Response.json({ ok: false, code: 'UNAUTHORIZED', message: '后台登录已失效，请重新登录' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      requestId?: unknown;
      provinceCode?: unknown;
      items?: unknown;
    };
    const result = await createScoreSubmission(
      typeof body.requestId === 'string' ? body.requestId : '',
      typeof body.provinceCode === 'string' ? body.provinceCode : '',
      Array.isArray(body.items) ? body.items : [],
    );
    if (result.kind === 'invalid') {
      return Response.json({ ok: false, code: 'INVALID_ENTRY', message: result.message }, { status: 400 });
    }
    return Response.json(
      {
        ok: true,
        submission: result.submission,
        displayEventId: result.displayEvent?.id ?? null,
        idempotent: result.kind === 'existing',
      },
      { status: result.kind === 'created' ? 201 : 200 },
    );
  } catch (error) {
    console.error('score_entry_create_failed', error);
    return Response.json({ ok: false, code: 'ENTRY_CREATE_FAILED', message: '积分登记失败，请稍后重试' }, { status: 503 });
  }
}
