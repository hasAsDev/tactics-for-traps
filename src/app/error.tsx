"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="panel-wood mx-auto flex max-w-[32rem] flex-col items-center gap-4 p-6 text-center">
      <h1 className="text-title">Bàn cờ bị lật!</h1>
      <p>Có lỗi xảy ra khi tải trang này.</p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        Thử lại
      </button>
    </section>
  );
}
