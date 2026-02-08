# AI Chatbot — Slayt Oluşturucu

Next.js ve Vercel AI SDK ile geliştirilmiş, **AI destekli sohbet** ve **otomatik slayt üretimi** sunan açık kaynaklı bir chatbot uygulaması. Vercel AI Chatbot şablonu temel alınmış; Google ile giriş ve slayt (slides) artifact özellikleri eklenmiştir.

---

## Özellikler

### Sohbet ve AI

- **Next.js 16** App Router, React Server Components ve Server Actions
- **Vercel AI SDK** ile metin, yapılandırılmış nesneler ve tool çağrıları
- **Vercel AI Gateway** üzerinden çoklu model desteği (Anthropic, OpenAI, Google, xAI, Mistral vb.)
- Sohbet geçmişi, mesaj oylama, önerilen eylemler

### Slayt (Slides) Artifact

- Sohbet üzerinden “X konusunda 5 slaytlık sunum yap” gibi taleplerle **otomatik slayt oluşturma**
- Sol panel: slayt sayfaları listesi, sağ panel: seçili slaytın metin ve görsel içeriği
- Slayt metinleri ve görselleri **tıklanarak düzenlenebilir**
- Versiyonlama: önceki/sonraki sürüm geçişi (Undo/Redo, “Back to latest” / “Restore”)
- Slayt metni için artifact model (örn. Mistral Nemo), görseller için görsel üretim modeli (örn. Imagen)

**Slayt oluşturma örnekleri** (tıklayarak büyütebilirsiniz):

| | |
|:---:|:---:|
| [![Slayt oluşturma örneği 1](docs/screenshot-1.png)](docs/screenshot-1.png) | [![Slayt oluşturma örneği 2](docs/screenshot-2.png)](docs/screenshot-2.png) |
| *Örnek 1* | *Örnek 2* |

### Diğer Artifact Türleri

- Metin (text), kod (code), görsel (image), tablo (sheet) artifact’ları
- Document tabanlı versiyonlama ve öneri (suggestion) sistemi

### Kimlik Doğrulama

- **Auth.js (NextAuth)** ile e-posta/şifre ve **Google OAuth** girişi
- Oturumsuz kullanıcılar siteyi açar; mesaj göndermeye çalışınca giriş/kayıt modal’ı açılır
- Slayt ve sohbet verileri kullanıcı bazlı yönetilir

### Veri ve Altyapı

- **PostgreSQL** (Drizzle ORM): kullanıcı, sohbet, mesaj, oy, document, suggestion
- **Vercel Blob**: dosya yükleme ve depolama
- **Redis**: (isteğe bağlı) oturum/önbellek
- **shadcn/ui** + **Tailwind CSS** + **Radix UI** ile erişilebilir arayüz

---

## Gereksinimler

- Node.js 18+
- pnpm 9+
- PostgreSQL (yerel için Docker Compose ile sağlanabilir)

---

## Kurulum

### 1. Bağımlılıkları yükle

```bash
pnpm install
```

### 2. Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyalayıp doldur:

```bash
cp .env.example .env.local
```

**Zorunlu / önerilen değişkenler:**

| Değişken | Açıklama |
|----------|----------|
| `AUTH_SECRET` | Auth.js için gizli anahtar ([örnek](https://generate-secret.vercel.app/32) veya `openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth ([Google Cloud Console](https://console.cloud.google.com/apis/credentials)) |
| `AI_GATEWAY_API_KEY` | Vercel dışında deploy için AI Gateway API anahtarı |
| `POSTGRES_URL` | PostgreSQL bağlantı URL’si |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob depolama (dosya yükleme) |
| `REDIS_URL` | İsteğe bağlı Redis |

**Yerel PostgreSQL (Docker):**

```bash
docker compose up -d
```

`.env.local` içinde:

```env
POSTGRES_URL=postgresql://postgres:postgres@localhost:55432/ai_chatbot
```

### 3. Veritabanı migrasyonu

```bash
pnpm db:migrate
```

### 4. Geliştirme sunucusu

```bash
pnpm dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışır.

---

## Vercel ile deploy

1. Projeyi Vercel’e bağla; ortam değişkenlerini Vercel paneline ekle.
2. AI Gateway, Blob ve Postgres için Vercel entegrasyonları kullanılabilir; Vercel deploy’da AI Gateway için OIDC token otomatik kullanılır.
3. Build komutu: `pnpm build` (içeride `db:migrate` çalışır).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/ai-chatbot)

---

## Proje yapısı (özet)

| Bölüm | Açıklama |
|-------|----------|
| `app/(auth)/` | Giriş, kayıt, Auth API (NextAuth) |
| `app/(chat)/` | Sohbet sayfaları, chat/document/slides API’leri |
| `artifacts/` | Slayt, metin, kod, görsel, tablo artifact bileşenleri |
| `components/` | Sohbet, mesaj, artifact, sidebar, UI bileşenleri |
| `components/ui-slide/` | Slayt önizleme ve slayt içeriği bileşenleri |
| `lib/ai/` | Model tanımları, prompt’lar, tool’lar |
| `lib/db/` | Drizzle şeması, migrasyonlar, sorgular |
| `docs/` | Slayt artifact gereksinimleri, case ve teknik notlar |

---

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `pnpm dev` | Geliştirme sunucusu (Turbopack) |
| `pnpm build` | DB migrasyon + Next.js build |
| `pnpm start` | Production sunucusu |
| `pnpm db:migrate` | Veritabanı migrasyonlarını uygula |
| `pnpm db:generate` | Drizzle migration dosyalarını üret |
| `pnpm db:studio` | Drizzle Studio (DB arayüzü) |
| `pnpm lint` | Ultracite ile lint |
| `pnpm format` | Ultracite ile format |
| `pnpm test` | Playwright E2E testleri |

---

## Lisans

Proje [LICENSE](LICENSE) dosyasındaki koşullara tabidir. Vercel AI Chatbot şablonu temel alınmıştır.
