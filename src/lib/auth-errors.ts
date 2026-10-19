/** Đổi mã lỗi của Better Auth (và của hook riêng) sang thông báo tiếng Việt. */

const MESSAGES: Record<string, string> = {
  USERNAME_IS_ALREADY_TAKEN: "Tên đăng nhập này đã có người dùng.",
  USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER: "Tên đăng nhập này đã có người dùng.",
  USERNAME_TOO_SHORT: "Tên đăng nhập cần ít nhất 3 ký tự.",
  USERNAME_TOO_LONG: "Tên đăng nhập tối đa 20 ký tự.",
  INVALID_USERNAME:
    "Tên đăng nhập gồm 3–20 ký tự: chữ không dấu (a–z), số, dấu gạch ngang hoặc gạch dưới.",
  INVALID_USERNAME_OR_PASSWORD: "Sai tên đăng nhập hoặc mật khẩu.",
  INVALID_EMAIL_OR_PASSWORD: "Sai tên đăng nhập hoặc mật khẩu.",
  INVALID_PASSWORD: "Mật khẩu hiện tại không đúng.",
  PASSWORD_TOO_SHORT: "Mật khẩu cần ít nhất 8 ký tự.",
  PASSWORD_TOO_LONG: "Mật khẩu tối đa 128 ký tự.",
  DISPLAY_NAME_EMPTY: "Vui lòng nhập tên hiển thị.",
  DISPLAY_NAME_TOO_LONG: "Tên hiển thị tối đa 30 ký tự.",
  DISPLAY_NAME_INVALID: "Tên hiển thị có ký tự không hợp lệ.",
  SIGNUP_DISABLED: "Hiện đang tạm đóng đăng ký.",
  INVALID_INVITE_CODE: "Mã mời không đúng.",
  FIELD_NOT_ALLOWED: "Có trường không được phép gửi.",
  FIELD_NOT_EDITABLE: "Trường này không sửa được.",
  USERNAME_IS_IMMUTABLE: "Không đổi được tên đăng nhập.",
};

const FALLBACK = "Có lỗi xảy ra. Thử lại nhé.";
const RATE_LIMITED = "Bạn thử quá nhiều lần. Đợi vài phút rồi thử lại.";

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!error) return FALLBACK;
  if (error.status === 429) return RATE_LIMITED;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.message && MESSAGES[error.message]) return MESSAGES[error.message];
  return FALLBACK;
}
