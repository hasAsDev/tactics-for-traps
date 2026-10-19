import Link from "next/link";
import { Sprite } from "@/components/pixel/Sprite";

export default function NotFound() {
  return (
    <section className="panel-wood mx-auto flex max-w-[32rem] flex-col items-center gap-4 p-6 text-center">
      <Sprite id="king-s" palette="iron" scale={6} />
      <h1 className="text-title">Ô cờ này trống</h1>
      <p>Không tìm thấy trang hoặc kỳ thủ bạn cần. Có thể tên đã đổi hoặc tài khoản đã bị xóa.</p>
      <Link href="/" className="btn btn-primary">
        Về Sảnh
      </Link>
    </section>
  );
}
