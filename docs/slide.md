# Slides Artifact — Uygulama Planı

## 1. Hedef ve Kapsam

- **Kaynak:** `docs/slides-artifact-requirements.md` ve `docs/case.md`'deki Slides Artifact istekleri.
- **Önceki / sonraki versiyon geçişi:** Mevcut artifact'taki gibi (Undo/Redo + VersionFooter "Back to latest" / "Restore").
- **Slayt özel UI:** Karışmaması için `components/ui-slide/` (veya `app/(chat)/ui-slide/`) altında toplanacak.
- **Tasarım:** Slayt UI ve layout tasarımı için proje kökündeki `.ornek` klasörü incelenebilir (`.ornek/` içinde örnek slides artifact ve bileşenler var).
- **Mevcut yapı:** Document `(id, createdAt)` versiyonlama ve artifact handler yapısı mümkün olduğunca tekrar kullanılacak.

### 1.1 LLM / Model yapılandırması (Vercel, ayrı klasör ve sayfa)

LLM'ler Vercel üzerinden seçilecek (mevcut Vercel AI / provider yapısı kullanılacak). Modelleri istediğin zaman rahatça değiştirebilmek için:

- Modellere özel ayrı bir klasör ve kod sayfası olacak (örn. `lib/ai/models/` veya `lib/ai/config/`).
- Tüm kullanılacak modeller (chat, artifact, görsel vb.) tek yerde listelenecek; modele girip tek dosyadan ekleme/çıkarma/değiştirme yapılabilecek.
- Böylece model değişikliği için projeyi taramak gerekmez; sadece bu klasördeki ilgili dosyaya girilir.

### 1.2 Slayt oluşturma akışı (hangi model ne zaman?)

Kullanıcı slayt prompt'u yazınca mesaj önce kullanıcının seçtiği chat modeline gider; slayt içeriği (title, article, image) ise tool çalıştığında ayrı modellere gider.

- Kullanıcı yazar: örn. "X konusunda 5 slaytlık sunum yap."
- Bu mesaj kullanıcının seçtiği chat modeline gider (`lib/ai/models.ts`'teki listeden; örn. Gemini, Claude).
- Chat modeli karar verir: "Slayt istiyor" deyip tool-call döner: `createDocument({ title: "...", kind: "slides" })`.
- Tool çalışır: createDocument (slides) tetiklenir; slides handler devreye girer.
- Slides handler içinde: Slayt yapısı (her slaytın title + body'si) → artifact model. Her slaytın görseli → image model.

**Özet tablo:**

| Aşama | Ne / Kimin mesajı? | Hangi model? |
|-------|--------------------|--------------|
| Kullanıcı "slayt yap" | Chat'e giden mesaj | Kullanıcının seçtiği chat modeli |
| Model "slayt aç" der | Tool-call: createDocument(slides) | Aynı chat modeli |
| Tool çalışır: metinler | Her slayt için title + body | Artifact model (örn. mistral/mistral-nemo) |
| Tool çalışır: görseller | Her slayt için image | Image model (örn. google/imagen-4.0-fast-generate-001) |

Yani: Slayt isteği kullanıcının seçtiği modele gidiyor; o model sadece "slayt aç" kararı verip tool'u çağırıyor. Title, article ve image ise tool çalıştığında artifact model + image model ile oluşuyor (ayrı klasörde tanımlı modeller).

### 1.3 Slayt için önerilen modeller (maliyet düşük, proje çalışsın yeter)

Vercel AI Gateway ile kullanılabilir; maliyet düşük tutulabilir.

- **Title + article (metin):** `mistral/mistral-nemo` (artifact model olarak).
- **Görsel:** `google/imagen-4.0-fast-generate-001` (image model olarak).

Bu ID'ler `lib/ai/models` veya ilgili config'te tanımlanacak; slides handler artifact model ve image modeli oradan kullanacak.

---

## 2. Veritabanı (DB) Tarafı

### 2.1 Mevcut durum (proje)

- **`lib/db/schema.ts`:** document tablosu `id`, `createdAt`, `title`, `content`, `kind`, `userId`. PK: `(id, createdAt)` → her kayıt = bir versiyon.
- **kind:** `["text", "code", "image", "sheet"]` — "slides" yok.
- **.ornek:** `document.kind` ve `chat.artifactKind` içinde "slides" zaten var; referans alınabilir.

### 2.2 Yapılacaklar (DB)

| # | Dosya / İşlem | Açıklama |
|---|---------------|----------|
| 1 | `lib/db/schema.ts` | document.kind enum'ına "slides" ekle (`["text", "code", "image", "sheet", "slides"]`). |
| 2 | Migration | `pnpm db:generate` → yeni migration; `pnpm db:migrate` ile uygula. |
| 3 | Ek tablo yok | Slayt içeriği `document.content` (text/JSON) içinde saklanacak; mevcut getDocumentsById / getDocumentById / saveDocument aynen kullanılır. |

**Sonuç:** Slayt dökümanları da diğer artifact'lar gibi Document satırları olacak; aynı versiyon mantığı (önceki/sonraki) kullanılır.

---

## 3. Veri Modeli (Slayt İçeriği)

- `document.content` = JSON string.
- Her slaytın sabit bir `id`'si olacak; "hangi sayfa" index ile değil `slideId` ile.

**Tip** (`lib/types` veya ui-slide içinde):

```ts
type Slide = {
  id: string;           // zorunlu, sabit (örn. UUID)
  title: string;
  body: string;
  imagePrompt?: string;
  image?: string;       // base64 veya URL
};
type SlidesContent = { slides: Slide[] };
```

**Versiyonlama:** Her `saveDocument` çağrısı yeni `(id, createdAt)` satırı ekler; `getDocumentsById(id)` ile tüm versiyonlar createdAt artan sırada alınır. Mevcut `handleVersionChange` ve `currentVersionIndex` ile önceki/sonraki geçiş sağlanır.

### 3.1 Slayt öğesiyle güncelleme (title / body / image ayrı)

- **Hedefler:** title, body, image — her biri ayrı ayrı güncellenir; biri güncellenirken diğerleri değişmez.
- **Kullanıcı akışı:** Kullanıcı slaytta title, body veya image'dan birine tıklar → modal açılır → prompt girer → sadece tıklanan öğe (title / body / image) AI ile güncellenir.
- **Kimlik:** Render'da her tıklanabilir alana `slideId` + `target` verilir: `onElementClick(slide.id, "title" | "body" | "image")`. API'da slideId + target kullanılır; index yok.

**API:** `POST /api/document/update-slide-element`

- **Body:** `{ documentId: string; slideId: string; target: "title" | "body" | "image"; prompt: string; }`
- **Backend:** getDocumentById → parse → `slides.find(s => s.id === slideId)` → target'a göre LLM (title/body) veya görsel API (image) → sadece o alanı güncelle → saveDocument (yeni versiyon).

**UI:** Title, body, image üçü de tıklanabilir; tıklanınca aynı modal açılır, target'a göre başlık değişir ("Başlığı güncelle" / "Metni güncelle" / "Görseli güncelle"). Modal'da prompt + "Güncelle" butonu.

---

## 4. Kod Tarafı — Modüller ve Sorumluluklar

### 4.1 Genel mimari (mevcut yapıya uyum)

- **Artifact türü:** `artifactKinds` ve `documentHandlersByArtifactKind` içine "slides" eklenecek.
- **Tool:** createDocument zaten `kind` alıyor; modele "slayt oluştur" denince `kind: "slides"` ile çağrılacak (prompt + artifacts prompt güncellemesi).
- **Slayt özel UI:** Tüm slayt bileşenleri `components/ui-slide/` altında toplanacak (liste, önizleme, düzenlenebilir metin/görsel, versiyon bar'ı vb.) ki mevcut artifact/components ile karışmasın.

### 4.2 Yapılacaklar (liste)

| Sıra | Nerede | Ne |
|------|--------|-----|
| 1 | `lib/db/schema.ts` | document.kind enum'ına "slides" ekle. |
| 2 | `lib/db/migrations/` | Yeni migration üret ve uygula. |
| 3 | `lib/artifacts/server.ts` | slidesDocumentHandler import et; documentHandlersByArtifactKind ve artifactKinds içine "slides" ekle. |
| 4 | `artifacts/slides/server.ts` (yeni) | createDocumentHandler<"slides">: onCreateDocument (LLM ile slayt yapısı + görsel API), onUpdateDocument (tüm slayt güncelleme). Tek öğe güncelleme ayrı endpoint ile (madde 5). |
| 5 | `app/(chat)/api/document/update-slide-element/route.ts` (yeni) | POST: documentId, slideId, target ("title"\|"body"\|"image"), prompt. Sadece o slaytın o alanını günceller; saveDocument ile yeni versiyon. |
| 6 | `artifacts/slides/client.tsx` (yeni) | Slayt artifact tanımı: kind: "slides", onStreamPart (örn. data-slidesDelta), content → ui-slide container'ını render eder. |
| 7 | `components/artifact.tsx` | artifactDefinitions içine slides client'tan gelen tanımı ekle (ArtifactActions / toolbar'da Undo/Redo). |
| 8 | `components/ui-slide/` (yeni klasör) | Slayt penceresi düzeni: Solda = slayt sayfaları listesi (yukarıdan aşağıya). Sağda = seçili slaytın ekranı (title, body, image; tıklanabilir → modal → prompt → sadece o öğe güncellenir). Versiyon bar'ı mevcut artifact layout'undan. |
| 9 | `lib/ai/prompts.ts` | Slayt için kısa kural: "Slayt/presentation isteğinde createDocument, kind: 'slides', title: konu." + slides için ayrı slidesPrompt (kaç slayt, JSON şeması). |
| 10 | `app/(chat)/api/chat/route.ts` | tools ve experimental_activeTools içine createDocument zaten var; kind: "slides" sadece prompt ile tetiklenir. Ek route gerekmez. |
| 11 | Görsel üretim | Görsel API (OpenAI Image, vb.) modüler bir modül (örn. `lib/ai/image.ts`) ile; slides server bu modülü çağırır. |
| 12 | `lib/ai/models/` veya `lib/ai/config/` (ayrı klasör ve dosya) | LLM'ler Vercel'den seçilecek; tüm modeller (chat, artifact, görsel) tek yerde listelenecek. İstediğin zaman bu klasördeki ilgili dosyaya girip modeli rahatça değiştirebileceksin; projeyi taramana gerek kalmaz. |

---

## 5. Önceki / Sonraki Versiyon Geçişi

- **Veri:** Aynı Document tablosu; `getDocumentsById(id)` → documents[]; `currentVersionIndex` ile hangi versiyonun gösterileceği.
- **Mantık:** Mevcut `artifact.tsx` içindeki `handleVersionChange("prev" | "next" | "latest")` ve `getDocumentContentById(currentVersionIndex)` aynen kullanılacak; slides sadece content'i SlidesContent olarak parse edip gösterecek.

**UI:**

- **ArtifactActions:** Undo (önceki) / Redo (sonraki) — mevcut text/sheet'teki gibi; slides artifact tanımına da aynı aksiyonlar eklenir.
- **VersionFooter:** `!isCurrentVersion` iken altta "You are viewing a previous version" + "Restore this version" + "Back to latest version" — mevcut VersionFooter component'i slides için de kullanılır (aynı documents, currentVersionIndex, handleVersionChange).
- **ui-slide içinde:** Sadece slayt listesi ve seçili slayt görünümü; versiyon bilgisi ve butonlar mevcut artifact layout'undan gelir (ortak kullanım).

Böylece projede "önceki/sonraki versiyon" davranışı slides için de aynı kalır; ek DB veya ek versiyon mantığı yazılmaz.

---

## 6. ui-slide Klasörü (Slayt Özel UI)

**Amaç:** Slayt penceresine özel tüm UI tek yerde; mevcut `components/` (artifact, version-footer, toolbar vb.) ile karışmasın.

**Önerilen yer:** `components/ui-slide/` (veya `components/slides/`).

### Slayt penceresi düzeni (açık belirtim)

- Slayt istediğimizde sağda açılan ekran (mevcut artifact penceresi gibi), içinde iki bölüme ayrılır:
  - **Sol taraf:** Slayt sayfalarının listesi. Slaytlar yukarıdan aşağıya listelenir; bir slayta tıklanınca seçili slayt değişir.
  - **Sağ taraf:** Seçili slaytın ekranı. O slaytın title, body ve image'ı burada gösterilir; her biri tıklanabilir (modal → prompt → sadece o öğe güncellenir).
- **Özet:** Solda slayt sayfaları, sağda slayt ekranı.

### İçerik önerisi

| Bileşen | Açıklama |
|---------|----------|
| **SlideList.tsx** | Sol panel: slayt kartları / liste (yukarıdan aşağıya), tıklanınca selectedIndex ile seçili slayt değişir. |
| **SlideDetail.tsx** | Sağ panel: seçili slaytın title/body/image'ı; title/body/image üçü tıklanabilir; tıklanınca onElementClick(slide.id, "title"\|"body"\|"image") → modal açılır → prompt → sadece o öğe güncellenir. |
| **SlideEditor.tsx** | İstersen tek bileşende ResizablePanelGroup (sol liste + sağ detay). |
| **UpdateSlideElementModal.tsx** | Modal: target'a göre başlık ("Başlığı güncelle" / "Metni güncelle" / "Görseli güncelle"), prompt alanı, "Güncelle" butonu; submit → POST /api/document/update-slide-element. |
| **parseSlidesContent.ts** | content: string → SlidesContent; buradan veya lib/utils / lib/types kullanılabilir. |

Bu bileşenlere content, currentVersionIndex, getDocumentContentById, onSaveContent, isCurrentVersion, onElementClick(slideId, target) gibi proplar content contract'ına uygun verilir; versiyon bar'ı ve Undo/Redo mevcut artifact layout'unda kalır.

---

## 7. Projede Ortaya Çıkacak Özellikler (Özet)

1. Kullanıcı sohbetten "X konusunda 5 slaytlık sunum yap" gibi talepte bulunur → model createDocument ile `kind: "slides"` çağırır.
2. Sağda Slides artifact penceresi açılır (slayt penceresi düzeni):
   - **Sol:** Slayt sayfaları listesi. Slaytlar yukarıdan aşağıya listelenir; aralarında geçiş yapılır.
   - **Sağ:** Seçili slaytın ekranı. O slaytın title, body, image'ı gösterilir. Title / body / image ayrı ayrı tıklanabilir; tıklanınca modal açılır, prompt girilir, sadece tıklanan öğe (title veya body veya image) AI ile güncellenir; diğerleri değişmez.
   - **Özet:** Solda slayt sayfaları, sağda slayt ekranı.
3. **Tek öğe güncelleme (title/body/image ayrı):** POST /api/document/update-slide-element (documentId, slideId, target: "title"\|"body"\|"image", prompt). Backend sadece o slaytın o alanını günceller; saveDocument ile yeni versiyon yazılır.
4. **Önceki / sonraki versiyon:** Toolbar'da Undo (önceki) / Redo (sonraki); eski bir versiyonda iken altta "Restore this version" / "Back to latest version" (mevcut VersionFooter).
5. **Metin:** LLM (mevcut artifact model); **görsel:** Görsel üretim API'si (modüler, tek yerde).
6. **Versiyonlama:** Her kayıt/güncelleme yeni Document satırı; listeleme ve geçiş mevcut yapı ile aynı.

---

## 8. .ornek'ten Yararlanılacak Noktalar

- **Tasarım:** UI ve layout tasarımı için proje kökündeki `.ornek` klasörüne bakılabilir (örn. `.ornek/ai-chatbot/artifacts/slides/`, `components/`).
- **SlidesContent** ve slayt JSON şeması (title, body, imagePrompt, image).
- **artifacts/slides/server.ts** akışı: streamObject + schema, sonra görsel üretim; data-slidesDelta ile UI'a yazma.
- **artifacts/slides/client.tsx** layout: ResizablePanelGroup, sol liste, sağ detay, selectedIndex, parseSlidesContent.
- **slides-update benzeri:** Tek öğe (title / body / image ayrı) güncelleme; ayrı endpoint POST /api/document/update-slide-element (documentId, slideId, target, prompt).
- **create-artifact sınıfı ve actions (Undo/Redo):** Ana projede zaten artifactDefinitions + ArtifactActions var; slides için de aynı action'lar eklenir.
- **Fark:** Ana projede slide'a özel tüm UI ui-slide altında toplanır; .ornek'teki slides UI'ı bu klasöre taşınacak şekilde uyarlanır.

---

## 9. Kısa Uygulama Sırası

1. **LLM/model yapılandırması:** Ayrı klasör ve kod sayfası (örn. lib/ai/models/ veya lib/ai/config/); modeller Vercel'den seçilecek, tek yerden değiştirilebilecek.
2. **DB:** schema + migration ("slides").
3. **lib/artifacts/server.ts:** slides handler kaydı.
4. **artifacts/slides/server.ts:** onCreateDocument + onUpdateDocument (LLM + görsel modül).
5. **app/(chat)/api/document/update-slide-element/route.ts:** POST (documentId, slideId, target, prompt); sadece o slaytın o alanını güncelle; saveDocument.
6. **lib/ai/prompts.ts:** slides kuralları + slidesPrompt.
7. **components/ui-slide/\*:** SlideList, SlideDetail, UpdateSlideElementModal, parseSlidesContent.
8. **artifacts/slides/client.tsx:** artifact tanımı, content → ui-slide.
9. **components/artifact.tsx:** slides'ı artifactDefinitions'a ekle.
10. **Versiyon:** Mevcut handleVersionChange + VersionFooter + ArtifactActions (Undo/Redo) kullanımını slides'a bağla.
11. **Görsel API modülü** ve env (API key).
12. **Test:** Slayt oluştur, düzenle, regenerate, önceki/sonraki versiyon geçişi.

Bu plan, DB ve kod tarafında neler yapılacağını, önceki/sonraki versiyon geçişini ve ui-slide ayrımını netleştiriyor.

---

## 10. Chat'ta Kare Önizleme ve Sağ Panel Akışı (Referans)

Bu davranış projede zaten var; şu an text, code, sheet, image artifact'ları için çalışıyor. Slayt için aynı akışı istiyorsak aşağıdaki parçaların slayt ile uyumlu hale getirilmesi gerekir.

### 10.1 Chat'ta kare önizleme

- **Nerede:** `components/message.tsx` — tool-createDocument veya tool-updateDocument part'ı olduğunda `<DocumentPreview result={part.output} />` (ve gerekirse args) render edilir.
- **Ne yapıyor:** `components/document-preview.tsx` içinde DocumentPreview:
  - `max-w-[450px]` ile kare/kutu bir alan çizer; üstte DocumentHeader (başlık, ikon), altta DocumentContent (içerik önizlemesi).
  - DocumentContent, `document.kind`'a göre dallanır: text → Editor, code → CodeEditor, sheet → SpreadsheetEditor, image → ImageEditor. **Slayt için branch şu an yok.**
- **.ornek'te:** DocumentContent içinde `document.kind === "slides"` branch'i var; burada SlidesPreview (`components/slide-ui/slides-preview.tsx`) kullanılıyor: slayt başlıkları + küçük resimler. **Projede bu branch eklenmeli;** slayt oluşturulunca chat'te slayta özel kare önizleme görünür.

### 10.2 Önizlemeye tıklayınca sağ panel

- **Nasıl açılıyor:** Önizlemenin üzerinde şeffaf HitboxLayer var. Tıklanınca `useArtifact().setArtifact` ile `isVisible: true`, documentId, kind, title, boundingBox set edilir.
- **Sağ panel:** `components/artifact.tsx` içinde `artifact.isVisible === true` olunca AnimatePresence + motion.div ile sağdan açılan tam-yükseklik panel render edilir. İçerik `artifact.kind`'a göre artifactDefinitions'dan seçilir (text/code/sheet/image editor vb.).
- **.ornek'te:** artifactDefinitions'a slidesArtifact (`artifacts/slides/client.tsx`) ekli; kind === "slides" olunca sağ panelde slayt listesi + seçili slayt detayı + güncelleme modal'ı açılır. **Projede slidesArtifact ve artifactDefinitions'a ekleme yapılmalı;** böylece slayt önizlemesine tıklanınca sağ panel slayt penceresi olarak açılır.

### 10.3 "Bitince" veya stream sırasında sağda açılma

- **.ornek'te:** `artifacts/slides/client.tsx` içinde onStreamPart'ta `data-slidesDelta` gelince setArtifact ile `isVisible: true` ve `status: "streaming"` set ediliyor; slayt stream edilirken panel otomatik açılabiliyor.
- **Projede:** Aynı mantık; slides artifact ve stream handler eklendiğinde "bitince" veya stream sırasında sağ panel açılması da aynı şekilde çalışır.

### 10.4 Slayt için projede eksikler (özet tablo)

| Parça | .ornek'te | Projede |
|-------|-----------|---------|
| Chat'ta kare önizleme | DocumentContent → kind===slides → SlidesPreview (başlıklar + resimler) | Bu branch yok; eklenmeli. |
| Slayt önizleme bileşeni | components/slide-ui/SlidesPreview | Yok; slide-ui veya ui-slide'a eklenmeli. |
| Sağ panel slayt içeriği | slidesArtifact → SlidesContentComp. | slidesArtifact yok; eklenmeli. |
| Artifact listesi | artifactDefinitions'a slidesArtifact | Sadece text, code, image, sheet. |
| DB/API | document.kind içinde "slides" | Schema'da "slides" eklenmeli (bölüm 2). |
| Backend | artifacts/slides/server.ts | Planlı; henüz yok. |

**Özet:** "Kod/slayt oluşturulunca chat'te kare önizleme, tıklayınca veya bitince sağda panel açılsın" davranışı projede mevcut mimariyle zaten var; slayt için .ornek'teki gibi slides artifact + chat'ta SlidesPreview + document-preview'da slides branch'i eklenmesi yeterli.
