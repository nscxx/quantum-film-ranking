import { clearAllScoreRecords } from '@/db/order-race';
import { hasValidControlSession, verifyControlPassword } from '@/lib/order-race/auth';

export async function POST(request: Request) {
  if (!(await hasValidControlSession(request))) {
    return Response.json({ ok: false, code: 'UNAUTHORIZED', message: '后台登录已失效，请重新登录' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    if (!verifyControlPassword(password)) {
      return Response.json({ ok: false, code: 'INVALID_PASSWORD', message: '活动口令不正确' }, { status: 403 });
    }
    const result = await clearAllScoreRecords();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const unconfigured = error instanceof Error && error.message === 'CONTROL_AUTH_NOT_CONFIGURED';
    console.error('score_clear_all_failed', error);
    return Response.json(
      {
        ok: false,
        code: unconfigured ? 'AUTH_NOT_CONFIGURED' : 'CLEAR_ALL_FAILED',
        message: unconfigured ? '后台口令尚未配置' : '全部清零失败，请稍后重试',
      },
      { status: 503 },
    );
  }
}
