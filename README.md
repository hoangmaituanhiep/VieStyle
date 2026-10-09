# VieStyle - Nền Tảng AI Gợi Ý & Phối Đồ Cổ Phục Việt Nam

VieStyle là ứng dụng web thời trang thông minh ứng dụng Trí tuệ Nhân tạo (AI) nhằm tôn vinh, bảo tồn và ứng dụng vẻ đẹp của **Cổ phục & Trang phục truyền thống Việt Nam** vào đời sống hiện đại. 

Hệ thống kết hợp khả năng am hiểu văn hóa sâu sắc từ **Google Gemini 3.8 Flash** cùng sức mạnh tạo ảnh chân thực độ phân giải cao của **Stable Diffusion XL** để mang lại trải nghiệm tư vấn phong cách toàn diện cho người dùng.

---

## Tính Năng Nổi Bật

### 1. Gợi Ý Trang Phục Sự Kiện Chuyên Sâu (AI Outfit Stylist)
- **Cố vấn chuyên gia Cổ phục**: Tích hợp System Prompt chuyên gia văn hóa trang phục Việt Nam, triệt tiêu thiên kiến (Anti-Bias) để đề xuất đa dạng các dòng cổ phục phù hợp thay vì chỉ lặp lại Áo Dài:
  - **Áo Tấc**: Dành cho dịp đại lễ, cưới hỏi, tế tự trang trọng.
  - **Áo Nhật Bình**: Dành cho phong cách hoàng tộc, dạ tiệc quyền quý.
  - **Áo Giao Lĩnh & Áo Viên Lĩnh**: Nét đẹp cổ điển thời Lê - Nguyễn.
  - **Áo Tứ Thân & Yếm lụa**: Tinh thần dân gian hội hè Bắc Bộ mộc mạc.
  - **Áo Ngũ Thân tay chẽn & Áo Mớ Ba Mớ Bảy**: Thanh lịch, trang nhã.
- **Phân tích bối cảnh đa chiều**: Đánh giá dựa trên địa điểm, tính chất sự kiện, thời tiết, quy định trang phục (dress code) và hồ sơ cá nhân.
- **Lý giải văn hóa & Mẹo tạo kiểu (`ai_reasoning` & `styling_tips`)**: Diễn giải học thuật về ý nghĩa bộ trang phục, kèm chỉ dẫn phối phụ kiện (kiềng bạc, hài thêu, quạt lụa, guốc mộc, khăn đóng).
- **Cơ chế Caching thông minh**: Tối ưu tốc độ phản hồi qua cơ sở dữ liệu Supabase khi gặp lại bối cảnh sự kiện tương đồng.

### 2. Xưởng Thử Đồ Mix & Match Trực Quan (Mix & Match Studio)
- **Tùy biến chi tiết**: Lựa chọn kiểu áo, tông màu chủ đạo, màu điểm xuyết, phụ kiện truyền thống và không gian di sản (Đại Nội Huế, phố cổ Hội An, đình làng Bắc Bộ...).
- **Tạo ảnh với Stable Diffusion XL riêng biệt**: Kết nối trực tiếp đến máy chủ Stable Diffusion XL tự vận hành (Google Colab GPU kết hợp đường hầm Ngrok).
- **Master Prompt chuẩn Nhiếp ảnh gia**: Sử dụng ống kính góc rộng 35mm f/8, ánh sáng điện ảnh tự nhiên tái hiện toàn thân người mẫu cùng không gian kiến trúc di sản sắc nét.
- **Trải nghiệm tức thì (Optimistic UI)**: Ảnh tạo xong được hiển thị ngay lập tức trên khung Preview và lưu vào lịch sử sáng tạo cá nhân.

### 3. Hồ Sơ Cá Nhân Hóa & Vòng Lặp Học Hỏi (Style Learning Loop)
- **Khảo sát gu thẩm mỹ**: Thiết lập độ tuổi, tính cách phong cách (Tối giản, Sang trọng thầm lặng, Cổ điển quý phái...), sở thích nghệ thuật và gam màu yêu thích.
- **Học hỏi từ đánh giá**: Ghi nhận đánh giá 1-5 sao cùng nhận xét của người dùng sau mỗi lần mặc để ngày càng tối ưu hóa các đề xuất tiếp theo.

### 4. Kho Lưu Trữ Cổ Phục Tuyển Chọn (Curated Wardrobe Catalog)
- Danh mục trang phục phong phú với hình ảnh chất lượng cao, mô tả chất liệu lụa tơ tằm, gấm dệt hoa văn truyền thống, nhãn phong cách và dịp sử dụng phù hợp.

### 5. Quản Trị & Đồng Bộ Dữ Liệu Supabase
- Hỗ trợ khởi tạo và kiểm tra kết nối cơ sở dữ liệu Supabase (PostgreSQL + Auth) thông qua bảng điều khiển tích hợp sẵn tập lệnh SQL hoàn chỉnh.

---

## Công Nghệ Sử Dụng (Tech Stack)

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4 mang phong cách mỹ thuật Á Đông trang nhã (Ivory `#FAF7F2`, Crimson `#8B1E1E`, Gold `#C5A059`, Charcoal `#141210`)
- **Typography**: Bộ phông chữ bản địa hóa `DTPhudu` độc đáo
- **Iconography**: Lucide React
- **Animations**: Motion

### Backend & AI Engine
- **Server**: Node.js & Express (`server.ts`) tích hợp Vite middleware cho môi trường phát triển liền mạch
- **AI Tư vấn & Ngôn ngữ**: `@google/genai` SDK v2 (Google Gemini 3.8 Flash) với kỹ thuật System Instruction chuyên sâu
- **AI Tạo ảnh (Image Synthesis)**: Self-Hosted Stable Diffusion XL (SDXL) chạy trên Google Colab GPU, kết nối qua Ngrok API
- **HTTP Client**: `axios` xử lý truyền nhận dữ liệu nhị phân (`arraybuffer`) và chuyển đổi Base64 an toàn

### Cơ Sở Dữ Liệu & Xác Thực
- **Supabase (PostgreSQL)**:
  - `profiles`: Lưu trữ thông tin người dùng và liên kết Supabase Auth
  - `outfits`: Danh mục trang phục truyền thống tuyển chọn
  - `user_preferences`: Gu thời trang và khảo sát người dùng
  - `suggestions_history`: Lịch sử gợi ý và đánh giá sao
  - `mix_history`: Lịch sử thử nghiệm phối đồ AI
  - Bảo mật bằng Row Level Security (RLS) và tăng tốc với GIN Indexes

---

## Cấu Trúc Thư Mục Dự Án

```
├── public/                 # Static assets
├── src/
│   ├── app/
│   │   └── api/            # API Route templates (Next.js / App Router)
│   │       ├── generate-outfit-image/route.ts
│   │       └── recommend-outfit/route.ts
│   ├── components/         # Giao diện thành phần (React Components)
│   │   ├── font/           # Phông chữ bản địa DTPhudu
│   │   ├── AuthModal.tsx
│   │   ├── DashboardView.tsx
│   │   ├── EventFormView.tsx
│   │   ├── Header.tsx
│   │   ├── MixMatchStudioView.tsx
│   │   ├── OutfitDetailModal.tsx
│   │   ├── PreferencesView.tsx
│   │   ├── RatingStars.tsx
│   │   ├── SupabaseSetupView.tsx
│   │   └── WardrobeCatalogView.tsx
│   ├── lib/                # Thư viện tiện ích & Cơ sở dữ liệu
│   │   ├── supabase.ts
│   │   └── supabase-schema.sql
│   ├── types/
│   │   └── next.d.ts       # Type definitions
│   ├── types.ts            # Data models & TypeScript interfaces
│   ├── index.css           # Global theme & typography styles
│   ├── main.tsx            # React entry point
│   └── App.tsx             # Main Application shell
├── server.ts               # Full-stack Node.js / Express Server
├── index.html              # HTML entry template
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build & proxy configuration
└── .env.example            # Mẫu cấu hình biến môi trường
```

---

## Hướng Dẫn Khởi Chạy

### 1. Khởi tạo model Stable Diffusion bằng cách chạy cell trong Google Collab
- https://colab.research.google.com/drive/1ER60qhEacQBpWwgNOQh1C4hYBIKdoRCi?usp=sharing

### 2. Cài đặt thư viện
```bash
npm install
```

### 3. Thiết lập Biến Môi trường
Tạo file `.env` từ `.env.example` và điền các khóa cần thiết:
```env
GEMINI_API_KEY="your_google_gemini_api_key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Chạy môi trường phát triển (Dev)
```bash
npm run dev
```
Ứng dụng sẽ hoạt động tại `http://localhost:3000`.

### 5. Build sản phẩm (Production)
```bash
npm run build
npm start
```

---

## Bản Quyền & Giấy Phép
Dự án được xây dựng với mục tiêu tôn vinh văn hóa và di sản trang phục truyền thống Việt Nam.
