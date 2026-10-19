import Link from "next/link";
import { getViewer } from "@/lib/session";

/** Nút ở hero: khách thấy Đăng ký/Đăng nhập, người đã đăng nhập thấy "Vào bàn cờ". */
export async function HeroCta() {
  const viewer = await getViewer();
  if (viewer) {
    return (
      <Link href={`/u/${viewer.username}`} className="btn btn-primary btn-lg">
        Vào bàn cờ
      </Link>
    );
  }
  return (
    <>
      <Link href="/register" className="btn btn-primary btn-lg">
        Đăng ký
      </Link>
      <Link href="/login" className="btn btn-lg">
        Đăng nhập
      </Link>
    </>
  );
}
