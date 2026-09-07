import { getScoreExportWorkbook } from '@/db/order-race';
import { hasValidControlSession } from '@/lib/order-race/auth';
import { buildExcelXmlWorkbook, formatShanghaiDateTime } from '@/lib/order-race/excel-xml';

function exportFileName(exportedAt: string) {
  const stamp = formatShanghaiDateTime(exportedAt).replaceAll(':', '').replace(' ', '-');
  return `量子膜积分导出-${stamp || 'data'}.xls`;
}

function contentDisposition(fileName: string) {
  const ascii = 'quantum-film-scores.xls';
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request) {
  if (!(await hasValidControlSession(request))) {
    return Response.json({ ok: false, code: 'UNAUTHORIZED', message: '后台登录已失效，请重新登录' }, { status: 401 });
  }
  try {
    const data = await getScoreExportWorkbook();
    const xml = buildExcelXmlWorkbook([
      {
        name: '明细',
        headers: ['登记时间', '省份', '套餐代码', '套餐名称', '件数', '单件积分', '小计积分', '整单积分', '状态', '登记单号'],
        rows: data.details.map((row) => [
          formatShanghaiDateTime(row.createdAt),
          row.provinceName,
          row.packageCode,
          row.packageTitle,
          row.quantity,
          row.unitPoints,
          row.subtotal,
          row.totalPoints,
          row.status,
          row.submissionId,
        ]),
      },
      {
        name: '汇总',
        headers: ['排名', '省份', '有效件数', 'A套餐件数', 'B套餐件数', 'C套餐件数', '有效积分', '最后登记时间'],
        rows: data.summaries.map((row) => [
          row.rank,
          row.provinceName,
          row.entryCount,
          row.packageA,
          row.packageB,
          row.packageC,
          row.score,
          formatShanghaiDateTime(row.latestScoreAt),
        ]),
      },
    ]);
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': contentDisposition(exportFileName(data.exportedAt)),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('score_export_failed', error);
    return Response.json({ ok: false, code: 'EXPORT_FAILED', message: '导出失败，请稍后重试' }, { status: 503 });
  }
}
