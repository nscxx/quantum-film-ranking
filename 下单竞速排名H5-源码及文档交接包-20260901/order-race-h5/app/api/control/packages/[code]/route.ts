import { updatePackagePoints } from '@/db/order-race';
import { hasValidControlSession } from '@/lib/order-race/auth';

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  if (!(await hasValidControlSession(request))) {
    return Response.json({ ok: false, code: 'UNAUTHORIZED', message: '后台登录已失效，请重新登录' }, { status: 401 });
  }
  try {
    const [{ code }, body] = await Promise.all([
      context.params,
      request.json() as Promise<{ points?: unknown }>,
    ]);
    const result = await updatePackagePoints(code, Number(body.points));
    if (result.kind === 'invalid') {
      return Response.json({ ok: false, code: 'INVALID_PACKAGE_POINTS', message: result.message }, { status: 400 });
    }
    return Response.json({
      ok: true,
      code: result.code,
      points: result.points,
      oldPoints: result.kind === 'updated' ? result.oldPoints : undefined,
      unchanged: result.kind === 'unchanged',
    });
  } catch (error) {
    console.error('package_points_update_failed', error);
    return Response.json({ ok: false, code: 'PACKAGE_POINTS_UPDATE_FAILED', message: '套餐积分保存失败，请稍后重试' }, { status: 503 });
  }
}
