import { createScoreEntry } from '@/db/order-race';
import { hasValidControlSession } from '@/lib/order-race/auth';

export async function POST(request: Request) {
  if (!(await hasValidControlSession(request))) {
    return Response.json({ ok: false, code: 'UNAUTHORIZED', message: '后台登录已失效，请重新登录' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      requestId?: unknown;
      provinceCode?: unknown;
      packageCode?: unknown;
    };
    const result = await createScoreEntry(
      typeof body.requestId === 'string' ? body.requestId : '',
      typeof body.provinceCode === 'string' ? body.provinceCode : '',
      typeof body.packageCode === 'string' ? body.packageCode : '',
    );
    if (result.kind === 'invalid') {
      return Response.json({ ok: false, code: 'INVALID_ENTRY', message: result.message }, { status: 400 });
    }
    return Response.json(
      { ok: true, event: result.event, idempotent: result.kind === 'existing' },
      { status: result.kind === 'created' ? 201 : 200 },
    );
  } catch (error) {
    console.error('score_entry_create_failed', error);
    return Response.json({ ok: false, code: 'ENTRY_CREATE_FAILED', message: '积分登记失败，请稍后重试' }, { status: 503 });
  }
}
