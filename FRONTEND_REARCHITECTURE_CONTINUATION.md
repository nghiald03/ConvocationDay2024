# Frontend Rearchitecture — Tiến trình và bàn giao

Cập nhật: 2026-08-30  
Workspace: `F:\CODE\ConvocationDay2024`  
Frontend: Next.js App Router, React, TypeScript strict, Bun

## 1. Trạng thái hiện tại

Đợt tái cấu trúc frontend thực tế đã được triển khai. Mã nguồn ứng dụng không còn nằm rải rác ở root `fe/`.

Cấu trúc hiện tại:

```text
fe/
├── public/                 # tài nguyên public theo quy ước Next.js
├── src/
│   ├── app/                # App Router và route handlers
│   ├── components/         # UI dùng chung và shadcn primitives
│   ├── features/           # vertical slices theo nghiệp vụ
│   ├── hooks/              # hook thực sự dùng chung
│   ├── lib/                # HTTP, query, realtime, env, utility hạ tầng
│   ├── providers/          # provider cấp ứng dụng (đang tiếp tục tinh gọn)
│   ├── config/             # cấu hình UI legacy còn dùng
│   ├── messages/           # tài nguyên i18n/docs legacy
│   ├── pages/              # Nextra docs Pages Router
│   └── utils/              # utility legacy còn dùng
├── tests/                  # test ngoài source production
├── package.json
├── bun.lockb
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

Các thư mục `.next`, `.cache`, `node_modules`, `data` và `uploads` ngoài `src` là output/cache/runtime data, không phải mã nguồn ứng dụng. `public` và `tests` cũng được giữ ngoài `src` đúng vai trò.

## 2. Những việc đã hoàn thành trong đợt tái cấu trúc FE

### 2.1. Hợp nhất source tree

- Di chuyển toàn bộ `fe/app` vào `fe/src/app`.
- Di chuyển `components`, `hooks`, `lib`, `providers`, `config`, `messages`, `pages` và `utils` vào `fe/src`.
- Di chuyển DTO và code nghiệp vụ vào feature sở hữu thay vì giữ các thư mục ngang hàng rời rạc.
- Cập nhật alias `@/*` chỉ trỏ tới `./src/*`.
- Cập nhật Tailwind content scan sang `./src/**/*.{ts,tsx}`.
- Cập nhật shadcn CSS path sang `src/app/globals.css`.
- Giữ `public` ở root frontend và sửa các import `@/public/...` thành public URL `/images/...`.

### 2.2. Tách feature theo nghiệp vụ

Các feature hiện có:

```text
src/features/
├── admin/
├── auth/
├── bachelor/
├── check-in/
├── hall/
├── led/
├── notification/
├── session/
└── statistics/
```

Mỗi feature đã bắt đầu dùng cấu trúc sâu, interface nhỏ:

```text
<feature>/
├── api/       # HTTP operation theo endpoint
├── model/     # domain type
├── queries/   # TanStack Query option/hook
└── ui/        # UI thuộc feature
```

Các phần đã chuyển đáng chú ý:

- Bachelor model, pagination model, CRUD, search, transfer session, temporary session và destructive delete.
- UI quản lý bachelor, import Excel, action button, danh sách chưa check-in và tra cứu chỗ ngồi.
- Check-in model và các operation check-in, list, create, update status, uncheck all.
- Hall model, API và query options.
- Session model, API, query options, realtime query và hall/session picker.
- LED domain response, API current/next/previous/initial, query hooks và display UI.
- Notification model, create API và TTS UI hook.
- Statistics model, API, query options và bảng chưa check-in.
- Admin database reset API.
- SignalR hook chuyển vào `src/lib/realtime`.
- Shared Axios/CSRF/error handling nằm trong `src/lib/http`.

### 2.3. Loại bỏ API trung tâm

- Đã xóa hoàn toàn `src/config/axios.ts`.
- Không còn consumer của `manageAPI`, `checkinAPI`, `ledAPI`, `statisticsAPI`, `notificationAPI` hoặc `testing`.
- UI không còn đọc cấu trúc `AxiosResponse` lồng nhiều tầng ở các luồng đã chuyển.
- HTTP function trả domain data có kiểu rõ ràng; error boundary vẫn giữ `unknown` ở hạ tầng.

### 2.4. React/Next và kiểu dữ liệu

- TanStack Query dùng query options dùng chung cho hall, session và statistics.
- Loại bỏ side effect trong một số `queryFn`; dữ liệu tổng hợp được derive bằng `useMemo`.
- SignalR hook dùng callback/dependency ổn định và generic payload.
- Sửa kiểu `sessionInDay` nullable để khớp backend.
- Sửa LED response để chuẩn hóa chuỗi rỗng từ backend thành `null` tại API boundary.
- Root layout dùng Montserrat qua `next/font/google` theo chuẩn dự án.

### 2.5. Docker context

- Thêm `fe/.dockerignore` để loại `.next`, `.cache`, `node_modules`, `uploads`, env và log khỏi build context.
- Thêm `be/.dockerignore` để loại `bin`, `obj`, appsettings thật, test output và log.
- Frontend Docker context mới khoảng **15 MB**, thay cho lần build cũ tăng lên hơn **860 MB**.

## 3. Kết quả kiểm tra mới nhất

Frontend local:

| Lệnh | Kết quả |
|---|---|
| `bun run lint` | PASS — 0 warning, 0 error |
| `bun run typecheck` | PASS |
| `bun test` | PASS — 1 test, 4 assertions |
| `bun run secrets:check` | PASS |
| `bun run build` | PASS — 60 static pages được sinh thành công |

Docker:

- `docker compose config --quiet`: PASS với biến validation tạm thời.
- Backend image build: PASS, 0 error; còn 68 warning nullable/style legacy.
- Frontend image build: PASS; compile, lint, typecheck và generate 60 static pages trong container đều thành công.
- Hai image `convocationday2024-be:latest` và `convocationday2024-fe:latest` đã được tạo thành công.
- Build context frontend đã giảm còn khoảng 15.02 MB.

Không có thay đổi màu sắc/theme trong đợt này, vì vậy workflow đo contrast không phát sinh.

## 4. Bảo mật và backend đã hoàn thành trước đó

- ASP.NET Core Identity, secure HttpOnly cookie, CSRF, CORS allowlist và permission policies.
- Login/logout/me/change-password/reset-password.
- SignalR dùng cookie; không truyền JWT qua query string.
- MinIO private bucket, media validation/re-encode/checksum và legacy migration dry-run.
- `Bachelor.DeleteAll` yêu cầu permission và header `X-Confirm-Destructive: DELETE ALL BACHELORS`, có audit.
- Database reset được bảo vệ bằng permission, feature flag và confirmation header.
- Các secret file thật đã được bỏ khỏi Git index nhưng vẫn giữ local và được ignore.
- Đã có `DEPLOYMENT_CUTOVER_RUNBOOK.md`, `.env.example`, `fe/.env.example` và secret scan.

## 5. Việc FE còn lại nên thực hiện tiếp

Ưu tiên tiếp theo:

1. Chuẩn hóa tên file legacy còn dùng sang kebab-case, đặc biệt provider/component có tên PascalCase hoặc camelCase.
2. Chuyển provider ứng dụng thực sự dùng chung vào `src/app/providers` hoặc giữ một `src/providers` có interface nhỏ; xóa provider/template không còn dùng.
3. Audit `src/components` để chuyển UI nghiệp vụ còn sót về feature sở hữu; chỉ giữ primitives và component thực sự dùng chung.
4. Tách utility legacy trong `src/utils` về feature hoặc `src/lib` theo ownership, sau đó xóa thư mục nếu rỗng.
5. Đánh giá Nextra docs trong `src/pages`; nếu không ship cùng sản phẩm thì tách khỏi production app để giảm bundle/dependency.
6. Thay các `any` legacy còn lại bằng error narrowing/domain type, ưu tiên mutation error handlers và import Excel.
7. Bổ sung query/mutation hooks cho bachelor và check-in để route UI không tự khai báo query key lặp lại.
8. Tách các route page lớn (manage bachelor, check-in management, MC controller) thành thin route + feature UI.
9. Bổ sung test cho API boundary normalization, query options, auth/session expiry và destructive actions.
10. Thêm Playwright smoke test cho login, protected route, check-in, upload và logout.

## 6. Việc vận hành chưa thể xác nhận chỉ bằng source code

- Rotate SQL, MinIO, SMTP và ElevenLabs credentials đã từng xuất hiện trong Git history.
- Chạy Identity/media migration trên staging copy có backup.
- Đối chiếu count/checksum media, restore drill và canary.
- Kiểm thử permission matrix với tài khoản CK/MN/MC/US/NO thật.
- Chỉ xóa `imageAPI` sau khi migration đã nghiệm thu và hết thời gian rollback.

## 7. Lệnh tiếp tục

```powershell
cd F:\CODE\ConvocationDay2024\fe
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun test
bun run secrets:check
bun run build
```

Docker validation:

```powershell
cd F:\CODE\ConvocationDay2024
docker compose config --quiet
docker compose build be fe
```

Không dùng npm, pnpm hoặc Yarn; không tạo lại `package-lock.json`.
