/**
 * Chép nội dung vào clipboard cả dạng có định dạng (HTML) lẫn chữ thường.
 * Dùng sự kiện `copy` + `execCommand` thay vì `navigator.clipboard`, vì API đó chỉ có ở trang HTTPS hoặc localhost,
 * trong khi ứng dụng có thể chạy trên địa chỉ HTTP trong mạng nội bộ. Phải gọi từ thao tác của người dùng (bấm nút).
 * Trả về true nếu đã chép được.
 */
export function copyRichText({ html, text }: { html: string; text: string }): boolean {
  let handled = false;
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    event.clipboardData.setData('text/html', html);
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
    handled = true;
  };
  document.addEventListener('copy', onCopy);
  try {
    // execCommand('copy') chỉ chạy khi đang có vùng chọn, nên chọn tạm một phần tử ẩn.
    const holder = document.createElement('span');
    holder.textContent = text;
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;white-space:pre';
    document.body.appendChild(holder);
    const selection = window.getSelection();
    const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const range = document.createRange();
    range.selectNodeContents(holder);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const ok = document.execCommand('copy');
    selection?.removeAllRanges();
    if (previous) selection?.addRange(previous);
    document.body.removeChild(holder);
    return ok && handled;
  } catch {
    return false;
  } finally {
    document.removeEventListener('copy', onCopy);
  }
}
