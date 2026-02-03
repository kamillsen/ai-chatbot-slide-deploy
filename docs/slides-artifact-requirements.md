# AI Destekli Slayt Oluşturucu — İstenenler Özeti

Bu doküman, `docs/case.md` içindeki **AI Destekli Slayt Oluşturucu (Slides Artifact)** ile ilgili tüm istekleri tek yerde toplar.

---

## 1. Özellik Tanımı

- Mevcut chatbot altyapısı kullanılarak **yeni bir artifact türü** eklenecek: **Slides**.
- Bu artifact, kullanıcı girdilerine göre AI ile **otomatik slayt üretimi** yapacak.
- Üretilen slaytlar, mevcut **essay / document** artifact’ları gibi **ayrı bir pencerede** (sağ panelde) gösterilecek.

---

## 2. Genel İşleyiş

| Adım | Ne olacak? |
|------|-------------|
| 1 | Kullanıcı sohbet arayüzünden slayt oluşturma talebinde bulunur. |
| 2 | **LLM** ve **görsel üretim API’leri** ile slayt içerikleri (metin + görsel) oluşturulur. |
| 3 | Slaytlar essay örneğindeki gibi ayrı pencerede listelenir ve görüntülenir. |

---

## 3. Arayüz ve Kullanıcı Deneyimi

Yeni açılan **slayt penceresinde** aşağıdaki yapı isteniyor:

### 3.1. Sol Panel

- Slayt **sayfalarının listelendiği** alan.
- Slaytlar **arasında geçiş** yapılabilsin.

### 3.2. Sağ Panel

- **Seçili slaytın** detaylı görünümü.
- Slayt içeriğinde:
  - **Metinler**
  - **Görseller**  
  Bu metin ve görseller **tıklanarak düzenlenebilir** olmalı.

### 3.3. AI ile Düzenleme ve Yeniden Üretim

- Düzenlenen içerikler AI API’leri ile:
  - **Yeniden üretilebilmeli (regenerate)**,
  - **Güncellenerek** slayta tekrar ayarlanabilmeli.

---

## 4. AI ve Model Kullanımı

| İçerik türü | Kullanılacak API / model |
|-------------|---------------------------|
| **Metinler** | LLM API’leri |
| **Görseller** | Görsel üretim modelleri / API’leri |

Ek beklentiler:

- **Regenerate** senaryoları düşünülmeli (tek slayt veya tek eleman yeniden üretilebilmeli).
- **Prompt tasarımı**: kontrollü, anlaşılır ve sürdürülebilir olmalı.

---

## 5. Teknik Beklentiler (Slayt ile İlgili Kısımlar)

### 5.1. Next.js

- App Router’ın doğru ve etkin kullanımı.
- Server / Client Component ayrımının bilinçli yapılması.
- Loading ve streaming’in doğru kullanılması.

### 5.2. AI Entegrasyonu ve State

- **Vercel AI SDK kullanılmamalı.** Bunun yerine:
  - **OpenAI**, **Google Gemini** veya eşdeğeri bir LLM API kütüphanesi kullanılmalı.
- LLM ve görsel üretim API çağrıları:
  - **Modüler**, **yeniden kullanılabilir**, **test edilebilir** olmalı.
- Slayt ve artifact state’leri:
  - **Regenerate**, **güncelleme**, **versiyonlama** senaryolarını desteklemeli.
- Loading, error, retry gibi async süreçler kullanıcı deneyimini bozmayacak şekilde yönetilmeli.

### 5.3. Genel Kod Kalitesi

- Okunabilir, bakımı kolay, sürdürülebilir kod.
- Gereksiz karmaşıklıktan kaçınılması.
- Ölçeklenebilir ve ürün odaklı mimari.

---

## 6. Özet Checklist (Slides Artifact)

- [ ] Yeni artifact türü: **Slides** (mevcut text/code/sheet yanında).
- [ ] Kullanıcı sohbetten slayt oluşturma talebi verebilsin.
- [ ] Slayt penceresi: **sol panel** (slayt listesi, geçiş) + **sağ panel** (seçili slayt, metin + görsel).
- [ ] Metin ve görseller **tıklanarak düzenlenebilir** olsun.
- [ ] İçerikler AI ile **regenerate** ve **güncelleme** ile slayta uyarlanabilsin.
- [ ] Metin için LLM, görsel için görsel üretim API’si kullanılsın.
- [ ] Vercel AI SDK **kullanılmasın**; OpenAI / Gemini veya eşdeğeri kullanılsın.
- [ ] API çağrıları modüler, test edilebilir; state regenerate/güncelleme/versiyonlamayı desteklesin.

---

*Kaynak: `docs/case.md` — sadece AI Destekli Slayt Oluşturucu ile ilgili maddeler özetlendi.*
