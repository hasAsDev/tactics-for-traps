import { Icon } from "@/components/pixel/Icon";

/** Form POST tới /api/lichess/connect (POST để prefetch không ghi đè cookie OAuth). */
export function ConnectLichessButton({ label = "Kết nối Lichess", className = "btn btn-primary" }: { label?: string; className?: string }) {
  return (
    <form action="/api/lichess/connect" method="post">
      <button type="submit" className={className}>
        <Icon name="chess" />
        {label}
      </button>
    </form>
  );
}
