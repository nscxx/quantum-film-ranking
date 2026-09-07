import { revokeScoreSubmission } from '@/db/order-race';
import { hasValidControlSession } from '@/lib/order-race/auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasValidControlSession(request))) {
    return Response.json({ ok: false, code: 'UNAUTHORIZED', message: '后台登录已失效，请重新登录' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const result = await revokeScoreSubmission(id);
    if (result.kind === 'invalid') {
      return Response.json({ ok: false, code: 'INVALID_EVENT', message: result.message }, { status: 400 });
    }
    if (result.kind === 'missing') {
      return Response.json({ ok: false, code: 'EVENT_NOT_FOUND', message: '这条积分记录不存在' }, { status: 404 });
    }
    return Response.json({ ok: true, submission: result.submission, idempotent: result.kind === 'already_revoked' });
  } catch (error) {
    console.error('score_entry_revoke_failed', error);
    return Response.json({ ok: false, code: 'ENTRY_REVOKE_FAILED', message: '撤销失败，请稍后重试' }, { status: 503 });
  }
}
