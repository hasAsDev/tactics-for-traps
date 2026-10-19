import { describe, expect, it } from "vitest";
import { databaseEnvNames, resolveDatabaseUrls } from "@/db/url.mjs";

describe("resolveDatabaseUrls", () => {
  it("dùng DATABASE_URL / DATABASE_URL_UNPOOLED khi có", () => {
    const env = {
      DATABASE_URL: "pooled",
      DATABASE_URL_UNPOOLED: "direct",
      POSTGRES_URL: "legacy",
      PRIMARY_DATABASE_URL: "prefixed",
    };
    expect(resolveDatabaseUrls(env)).toEqual({
      pooled: "pooled",
      direct: "direct",
      pooledName: "DATABASE_URL",
      directName: "DATABASE_URL_UNPOOLED",
    });
  });

  it("chấp nhận bộ tên kiểu cũ POSTGRES_URL", () => {
    const env = { POSTGRES_URL: "pooled", POSTGRES_URL_NON_POOLING: "direct" };
    expect(resolveDatabaseUrls(env)).toMatchObject({ pooled: "pooled", direct: "direct" });
  });

  it("chấp nhận tiền tố, lấy cặp từ cùng một tiền tố", () => {
    const env = {
      ZETA_DATABASE_URL: "z-pooled",
      PRIMARY_DATABASE_URL: "p-pooled",
      PRIMARY_DATABASE_URL_UNPOOLED: "p-direct",
    };
    expect(resolveDatabaseUrls(env)).toEqual({
      pooled: "p-pooled",
      direct: "p-direct",
      pooledName: "PRIMARY_DATABASE_URL",
      directName: "PRIMARY_DATABASE_URL_UNPOOLED",
    });
  });

  it("thiếu một nửa thì dùng nửa còn lại", () => {
    expect(resolveDatabaseUrls({ DATABASE_URL: "pooled" })).toMatchObject({ pooled: "pooled", direct: "pooled" });
    expect(resolveDatabaseUrls({ DATABASE_URL_UNPOOLED: "direct" })).toMatchObject({ pooled: "direct", direct: "direct" });
  });

  it("chỉ có chuỗi pooled của Neon thì bản direct bỏ -pooler khỏi host", () => {
    const pooled = "postgresql://u:p@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    expect(resolveDatabaseUrls({ DATABASE_URL: pooled })).toEqual({
      pooled,
      direct: "postgresql://u:p@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
      pooledName: "DATABASE_URL",
      directName: "DATABASE_URL",
    });
  });

  it("bỏ qua biến rỗng và tên chỉ trùng một phần", () => {
    const env = { DATABASE_URL: "", POSTGRES_PRISMA_URL: "x", POSTGRES_URL_NO_SSL: "y", PGHOST: "h" };
    expect(resolveDatabaseUrls(env)).toEqual({});
  });
});

describe("databaseEnvNames", () => {
  it("chỉ trả về tên biến liên quan tới database, đã sắp xếp", () => {
    const env = {
      PGHOST: "h",
      PRIMARY_PGUSER: "u",
      NEON_PROJECT_ID: "n",
      DATABASE_URL: "d",
      BETTER_AUTH_SECRET: "s",
      UPGRADE_FLAG: "1",
    };
    expect(databaseEnvNames(env)).toEqual(["DATABASE_URL", "NEON_PROJECT_ID", "PGHOST", "PRIMARY_PGUSER"]);
  });
});
