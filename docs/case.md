## Case Tanımı – AI Destekli Slayt Oluşturucu ve Google Login

Bu case kapsamında, açık kaynaklı **Vercel AI Chatbot** projesi temel alınarak, **AI destekli bir slayt oluşturma özelliği** geliştirmeniz beklenmektedir.

Referans proje: `https://github.com/vercel/ai-chatbot`

---

### 1. Geliştirilecek Özellikler

#### 1.1. AI Destekli Slayt Oluşturucu (Slides Artifact)

Mevcut chatbot altyapısı kullanılarak, yeni bir **artifact türü** oluşturulmalıdır. Bu artifact, kullanıcı girdileri doğrultusunda AI tarafından **otomatik slayt üretimini** sağlamalıdır.

**Genel İşleyiş**

- **Kullanıcı**, sohbet arayüzü üzerinden slayt oluşturma talebinde bulunur.
- **Büyük dil modelleri (LLM)** ve **görsel üretim API’leri** kullanılarak slayt içerikleri oluşturulur.
- Üretilen slaytlar, **essay** örneğinde olduğu gibi ayrı bir pencerede görüntülenir.

---

#### 1.2. Google Login (Google ile Giriş) Desteği

Uygulamaya **Google OAuth** tabanlı kullanıcı giriş desteği eklenmesi beklenmektedir.

**Beklenen Kapsam**

- Kullanıcıların Google hesapları ile:
  - Güvenli şekilde giriş yapabilmesi
  - Oturumlarının yönetilebilmesi
- Giriş yapan kullanıcıya ait:
  - Slayt oluşturma ve düzenleme işlemlerinin **kullanıcı bazlı** yönetilmesi
- Yetkilendirme ve oturum yönetiminin:
  - Güvenli
  - Ölçeklenebilir
  - Next.js mimarisi ile uyumlu olacak şekilde kurgulanması

> Not: Auth altyapısının (ör. **NextAuth / Auth.js** veya eşdeğeri) doğru yapılandırılması ve **best practice**’lere uygun olması beklenmektedir.

---

### 2. Arayüz ve Kullanıcı Deneyimi Gereksinimleri

Yeni açılan slayt penceresinde aşağıdaki yapı beklenmektedir:

#### 2.1. Sol Panel

- Slayt sayfalarının listelendiği bir alan
- Slaytlar arasında geçiş yapılabilmesi

#### 2.2. Sağ Panel

- Seçili slaytın detaylı görünümü
- Slayt içeriğinde yer alan:
  - Metinler
  - Görseller

Bu metinler ve görseller **tıklanarak düzenlenebilir** olmalıdır.

#### 2.3. AI ile Düzenleme ve Yeniden Üretim

- Düzenlenen içerikler, AI API’leri aracılığıyla:
  - **Yeniden üretilebilen (regenerate)**
  - **Güncellenerek** slayta ayarlanabilmelidir.

---

### 3. AI ve Model Kullanımı

- Slayt içerikleri:
  - **Metinler** için LLM API’leri
  - **Görseller** için görsel üretim modelleri kullanılarak oluşturulmalıdır.
- **Yeniden üretim (regenerate)** senaryoları dikkate alınmalıdır.
- Prompt tasarımı:
  - Kontrollü
  - Anlaşılır
  - Sürdürülebilir olmalıdır.

---

### 4. Next.js, AI ve Authentication – Teknik Beklentiler

Bu çalışmada aşağıdaki teknik kriterler özellikle değerlendirilecektir:

#### 4.1. Next.js Kullanımı

- App Router mimarisinin **doğru ve etkin** kullanımı
- **Server** ve **Client Component** ayrımının bilinçli yapılması
- Asenkron veri yönetimi, **loading** ve **streaming** yaklaşımlarının doğru uygulanması

#### 4.2. AI Entegrasyonu ve State Yönetimi

- **Vercel AI SDK kullanılmamalıdır.**
- Bunun yerine aşağıdakilerden biri (veya benzeri) kullanılmalıdır:
  - **OpenAI**
  - **Google Gemini**
  - veya eşdeğeri başka bir LLM API kütüphanesi
- LLM ve görsel üretim API çağrıları:
  - **Modüler**
  - **Yeniden kullanılabilir**
  - **Test edilebilir** bir yapıda tasarlanmalıdır.
- Slayt ve artifact state’leri:
  - Yeniden üretim (**regenerate**)
  - **Güncelleme**
  - **Versiyonlama** senaryolarını destekleyecek şekilde modellenmelidir.
- AI ile ilişkili async süreçlerin (**loading**, **error**, **retry**):
  - Kullanıcı deneyimini bozmayacak şekilde yönetilmesi beklenmektedir.

#### 4.3. Authentication ve Güvenlik

- Google OAuth entegrasyonu **güvenli** şekilde uygulanmalıdır.
- Oturum (**session**) yönetimi doğru yapılandırılmalıdır.
- Yetkilendirme kontrolleri **kullanıcı bazlı** olarak ele alınmalıdır.
- Gizli anahtarlar ve environment değişkenleri:
  - Güvenli şekilde yönetilmelidir.

#### 4.4. Yazılım Mühendisliği Yaklaşımı

- Okunabilir, bakımı kolay ve sürdürülebilir kod yapısı
- Gereksiz karmaşıklıktan kaçınılması
- Ölçeklenebilir ve **ürün odaklı** bir mimari yaklaşım

---

### 5. Deployment

Geliştirme tamamlandıktan sonra uygulamanın:

- **Cloudflare (ücretsiz plan)** üzerinde deploy edilmesi gerekmektedir.

Çalışır durumdaki uygulamanın:

- **Demo bağlantısının** tarafımızla paylaşılması beklenmektedir.

> Önemli: Geliştirilen özelliğe ait kaynak kodun paylaşılması talep edilmemektedir.  
> Herhangi bir repository veya PR erişimi istenmeyecektir.  
> Case tamamlandıktan sonra yalnızca **demo bağlantısı** paylaşmanız yeterlidir.

---

### 6. Sürecin Devamı

Case çalışmasının tamamlanmasının ardından:

- Geliştirilen çözüm ve mimari yaklaşım üzerinden ilerleyeceğimiz **detaylı bir teknik mülakat** süreci gerçekleştirilecektir.

Çalışmayı tamamladığınızda tarafımıza bilgi vermenizi rica ederiz.

Saygılarımızla,

