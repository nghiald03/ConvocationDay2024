# Frontend Rearchitecture — Tiến trình và bàn giao

Cập nhật: 2026-08-30  
Workspace: `E:\CODE\ConvocationDay2024`
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

### 2.6. Chuẩn hóa tên file và provider (đợt tiếp tục 2026-08-30)

- Không còn file source có tên PascalCase/camelCase; các route directory camelCase được giữ nguyên để không thay đổi URL công khai.
- Chuyển provider cấp ứng dụng vào `src/app/providers`.
- Chuyển authentication/authorization guard vào `src/features/auth/ui`.
- Chuyển layout shell/content về `src/components/partials/layout`.
- Xóa `URLProvider`, provider loader rỗng, QR scanner plugin đã bị comment và hai file utility/config không còn consumer.
- Chuyển utility dùng chung sang `src/lib` và export Excel về feature bachelor sở hữu.
- Thay `any` trong `safeIncludes` và direction provider bằng `unknown`/literal union tương ứng.

## 3. Kết quả kiểm tra mới nhất

### Cập nhật feature ownership, thin routes và tests (2026-08-30)

- Bổ sung query keys/options/hooks thuộc feature cho Bachelor và Check-in; filter/pagination trở thành một phần của query key.
- Tách route quản lý Bachelor, quản lý Check-in và MC controller thành thin route + feature UI.
- Hoàn thiện `features/media` gồm model, API operations, query options và UI; route upload không còn gọi Axios/fetch trực tiếp.
- Loại bỏ `src/lib/uploader.ts` pass-through và đưa mọi media endpoint operation về feature sở hữu.
- Chuẩn hóa thêm error boundary về `unknown` cho Bachelor form/import và Check-in management.
- Tách LED response normalization thành domain function có thể kiểm thử.
- Test frontend hiện có 8 test, 15 assertions cho safe redirect, HTTP errors, query options, LED normalization và destructive confirmation contract.

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

1. Audit `src/components` để chuyển UI nghiệp vụ còn sót về feature sở hữu; chỉ giữ primitives và component thực sự dùng chung.
2. Đánh giá Nextra docs trong `src/pages`; nếu không ship cùng sản phẩm thì tách khỏi production app để giảm bundle/dependency.
3. Thay các `any` legacy còn lại bằng error narrowing/domain type, ưu tiên notification display, manual check-in và dashboard demo code.
4. Tách các route page lớn còn lại (notification display, seating map, manual check-in, Noticer) thành thin route + feature UI.
5. Bổ sung test auth/session expiry và integration tests cần backend/MinIO test fixture.
6. Thêm Playwright smoke test cho login, protected route, check-in, upload và logout.

## 6. Việc vận hành chưa thể xác nhận chỉ bằng source code

- Rotate SQL, MinIO, SMTP và ElevenLabs credentials đã từng xuất hiện trong Git history.
- Chạy Identity/media migration trên staging copy có backup.
- Đối chiếu count/checksum media, restore drill và canary.
- Kiểm thử permission matrix với tài khoản CK/MN/MC/US/NO thật.
- Chỉ xóa `imageAPI` sau khi migration đã nghiệm thu và hết thời gian rollback.

## 7. Lệnh tiếp tục

```powershell
cd E:\CODE\ConvocationDay2024\fe
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun test
bun run secrets:check
bun run build
```

Docker validation:

```powershell
cd E:\CODE\ConvocationDay2024
docker compose config --quiet
docker compose build be fe
```

Không dùng npm, pnpm hoặc Yarn; không tạo lại `package-lock.json`.
