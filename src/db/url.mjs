// Tìm connection string Postgres trong biến môi trường.
// Neon (qua Vercel) thường thêm DATABASE_URL / DATABASE_URL_UNPOOLED, cùng bộ tên kiểu cũ
// POSTGRES_URL / POSTGRES_URL_NON_POOLING. Nếu lúc kết nối có đặt tiền tố thì tên thành
// <TIỀN_TỐ>_DATABASE_URL, ... File .mjs để dùng chung cho app, drizzle.config.ts và scripts/migrate.mjs.

/** Mỗi cặp: [chuỗi qua pooler, chuỗi kết nối thẳng]. */
const FAMILIES = [
  ["DATABASE_URL", "DATABASE_URL_UNPOOLED"],
  ["POSTGRES_URL", "POSTGRES_URL_NON_POOLING"],
];

/**
 * Chọn cặp pooled/direct từ cùng một nguồn: ưu tiên tên không tiền tố, rồi tới các tiền tố theo
 * thứ tự chữ cái. Thiếu bản direct thì dùng bản pooled và ngược lại.
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ pooled?: string; direct?: string; pooledName?: string; directName?: string }}
 */
export function resolveDatabaseUrls(env = process.env) {
  const prefixes = new Set([""]);
  for (const key of Object.keys(env).sort()) {
    if (!env[key]) continue;
    for (const name of FAMILIES.flat()) {
      if (key.endsWith(`_${name}`)) prefixes.add(key.slice(0, -name.length));
    }
  }
  for (const prefix of prefixes) {
    for (const [pooled, direct] of FAMILIES) {
      const pooledName = env[prefix + pooled] ? prefix + pooled : undefined;
      const directName = env[prefix + direct] ? prefix + direct : undefined;
      if (!pooledName && !directName) continue;
      const p = pooledName ?? directName;
      const d = directName ?? pooledName;
      return { pooled: env[p], direct: env[d], pooledName: p, directName: d };
    }
  }
  return {};
}

/**
 * Tên (không kèm giá trị) các biến có vẻ liên quan tới database, để chẩn đoán khi không tìm thấy.
 * @param {Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
export function databaseEnvNames(env = process.env) {
  return Object.keys(env)
    .filter((key) => /DATABASE|POSTGRES|NEON|(^|_)PG/.test(key))
    .sort();
}
