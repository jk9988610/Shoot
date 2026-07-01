/** 将 Supabase / Storage 错误转为可读提示 */
export function formatSupabaseError(err, bucket = 'shoot') {
  if (!err) return '未知错误';
  const msg = err.message || String(err);
  const status = err.statusCode || err.status;

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return '网络异常，请检查连接后重试';
  }
  if (status === 401 || msg.includes('JWT')) {
    return '云同步认证失败，请检查 Supabase anon key';
  }
  if (msg.includes('row-level security') || msg.includes('RLS')) {
    return '数据库权限不足，请执行 supabase/schema-shoot-bow.sql';
  }
  if (msg.includes('Bucket not found') || (msg.includes('bucket') && msg.includes('not found'))) {
    return `Storage 桶 ${bucket} 不存在，请在 Supabase 创建 Public 桶`;
  }
  return msg;
}
