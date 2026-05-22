# LaunchFrame AI MVP Overview

## Projenin Amaci

LaunchFrame AI, mobil uygulama gelistiren kisilerin uygulamalarini sosyal medyada daha kolay ve profesyonel sekilde tanitabilmesi icin tasarlanan bir web aracidir.

Uzun vadeli hedef, kullanicinin yukledigi uygulama screenshotlarini AI ile profesyonel Instagram promo gorsellerine donusturmek ve ileride bu icerikleri scheduling sistemiyle Instagram'da otomatik paylasmaktir.

Bu ilk MVP ise daha dar ve net bir kapsama sahiptir:

Kullanici web sitesine gelir, mobil uygulama screenshotunu yukler, uygulama bilgilerini girer, bir gorsel stil secer ve sistem Instagram post formatina uygun premium bir promo image olusturur.

## MVP Kapsami

Bu MVP'de olan ozellikler:

- Web tabanli arayuz
- Screenshot upload alani
- App bilgileri formu
- Style secimi
- AI image generation API icin prompt hazirlama
- Yuklenen screenshotu kullanarak promo image preview uretme
- Generated image preview
- Download butonu
- Responsive dark SaaS tasarim

Bu MVP'de bilincli olarak olmayan ozellikler:

- Authentication
- Database
- Instagram API entegrasyonu
- Scheduling sistemi
- Otomatik post paylasimi
- 30 gunluk icerik plani

## Su Ana Kadar Yapilanlar

Proje sifirdan, bagimlilik gerektirmeyen statik bir frontend olarak kuruldu. Yani su an `index.html` dosyasi direkt tarayicida acilarak calisabilir.

Eklenen ana dosyalar:

- `index.html`: Uygulamanin ana HTML yapisi.
- `src/styles.css`: Modern dark SaaS arayuz stilleri.
- `src/app.js`: Form, upload, prompt generation, canvas preview ve download mantigi.
- `README.md`: Kisa calistirma ve AI endpoint notlari.

## Arayuz Yapisi

Uygulama iki ana bolumden olusur:

Sol panel:

- App Name
- Category
- Short Description
- Target Audience
- Style dropdown
- Screenshot upload
- Generate Promo Image butonu

Sag panel:

- Instagram post preview alani
- 1080 x 1080 canvas
- Download butonu
- Generated API prompt bolumu

Tasarim modern dark SaaS hissi verecek sekilde hazirlandi. Form ve preview alani masaustunde iki kolon olarak gorunur, mobilde ise tek kolonlu responsive yapiya doner.

## Image Generation Mantigi

Kullanici formu doldurup screenshot yuklediginde sistem su bilgileri toplar:

- App name
- Category
- Short description
- Target audience
- Selected visual style
- Uploaded screenshot

Bu bilgilerle image generation API'lerine uygun bir prompt hazirlanir.

Kullanilan prompt mantigi:

```text
Create a premium Instagram promotional image for a mobile app. Use the uploaded app screenshot as the main visual inside a modern smartphone mockup. App name: {{appName}}. Category: {{category}}. Description: {{description}}. Target audience: {{targetAudience}}. Visual style: {{style}}. Use a clean modern layout, premium SaaS aesthetic, soft lighting, high-quality composition, minimal text, and make it suitable for an Instagram launch post.
```

Su an backend ya da API key olmadigi icin uygulama varsayilan olarak local canvas renderer kullanir. Bu renderer, kullanicinin yukledigi screenshotu modern bir smartphone mockup icine yerlestirir ve Instagram post formatinda 1080 x 1080 bir promo gorsel uretir.

Bu sayede MVP, gercek AI API baglanmadan da demo edilebilir durumdadir.

## Style Secenekleri

Su anda desteklenen stiller:

- Minimal SaaS
- Modern Gradient
- Dark Tech
- App Store Launch
- Fun & Colorful

Her stil icin farkli renk paleti, vurgu rengi ve kompozisyon hissi tanimlandi.

## Download Ozelligi

Generated image canvas uzerinden PNG olarak uretilir. Kullanici `Download` butonuna bastiginda gorsel `instagram-promo-image.png` olarak indirilir.

## AI API Entegrasyonuna Hazirlik

Kodda gercek AI image generation servisi baglanabilsin diye bir endpoint hook birakildi.

Frontend su degere bakar:

```js
window.LAUNCHFRAME_AI_ENDPOINT
```

Bu deger set edilirse uygulama local canvas yerine belirtilen endpoint'e `POST` istegi gonderir.

Gonderilen `FormData` alanlari:

- `prompt`
- `appName`
- `category`
- `description`
- `targetAudience`
- `style`
- `screenshot`

Endpoint JSON olarak su alanlardan birini dondurebilir:

- `imageUrl`
- `url`
- `dataUrl`
- `b64_json`

Bu yapi sayesinde ileride backend eklendiginde frontend tamamen bastan yazilmak zorunda kalmaz.

## Next.js Ile Yapilir Mi?

Evet, bu proje Next.js ile rahatlikla yapilir. Hatta uzun vadeli hedeflere bakinca Next.js daha faydali olabilir.

Next.js'in avantajli olacagi noktalar:

- API route veya server action ile AI image generation endpointini ayni projede yazabilmek
- API key gibi gizli bilgileri frontend'e acmadan server tarafinda saklamak
- Upload islemlerini daha kontrollu yonetmek
- Ileride authentication eklemeyi kolaylastirmak
- Database entegrasyonu icin daha hazir bir mimari sunmak
- Generated image history, user projects ve planlama ozelliklerine daha rahat gecmek
- Deployment tarafinda Vercel gibi platformlarla kolay yayina almak

Mevcut statik versiyonun avantajlari:

- Cok hizli gelistirilir
- Kurulum gerektirmez
- MVP fikrini gostermek icin yeterlidir
- Backend/API olmadan demo edilebilir
- Tasarim ve urun akisini hizlica test etmeye uygundur

## Benim Onerim

Eger amac sadece ilk fikri gostermek, arayuzu test etmek ve kullanici akisinin mantikli olup olmadigini anlamaksa mevcut statik yapi yeterlidir.

Ama gercek AI image generation, kullanici hesaplari, kayitli projeler, odeme, Instagram entegrasyonu ve scheduling gibi ozelliklere gecilecekse projeyi Next.js'e tasimak daha dogru olur.

Pratik yol haritasi:

1. Mevcut statik MVP ile UI ve akisi dogrula.
2. AI image generation icin kullanilacak modeli ve backend ihtiyacini netlestir.
3. Sonra projeyi Next.js'e tasi.
4. API route ile image generation endpointini ekle.
5. Daha sonra auth, database ve scheduling ozelliklerini moduler sekilde buyut.

## Mevcut Durum

Proje artik Next.js App Router yapisina tasinmistir.

Calistirmak icin:

Gereksinim:

```text
Node.js 20.9 veya daha yeni
```

```bash
npm install
npm run dev
```

Sonra tarayicida:

```text
http://localhost:3000
```

Mevcut statik prototype dosyalari referans olarak `legacy-static-mvp/` altinda korunmustur:

- `legacy-static-mvp/index.html`
- `legacy-static-mvp/src/app.js`
- `legacy-static-mvp/src/styles.css`

Ana gelistirme bundan sonra Next.js dosyalari uzerinden devam etmelidir.

## AI API Baglamak Icin Gerekenler

Gercek image generation yapabilmek icin frontend tek basina yeterli degildir. API key gibi gizli bilgilerin kullanici tarayicisina gonderilmemesi gerekir. Bu yuzden image generation istegi server tarafindan yapilmalidir.

Gerekli ana parcalar:

- AI image generation saglayicisi
- Server-side API endpoint
- API key / secret yonetimi
- Screenshot upload handling
- Prompt builder
- AI response parser
- Generated image preview ve download akisi
- Hata ve loading state yonetimi

## AI Image Generation Saglayicisi

Bu urun icin kullanilabilecek image generation API'leri:

- OpenAI image generation API
- Replicate uzerindeki image modelleri
- Stability AI
- Farkli diffusion veya image editing servisleri

Bu proje icin onemli ihtiyac, sadece text-to-image degil, kullanicinin yukledigi screenshotu referans olarak kullanabilen bir image generation veya image editing akisi olmasidir.

Istenen sonuc:

Kullanicinin yukledigi app screenshotu korunmali, modern bir smartphone mockup icine yerlestirilmeli ve etrafinda premium Instagram promo kompozisyonu olusturulmalidir.

## Neden API Key Frontend'e Konmamali?

API key frontend koduna konursa herkes tarayicidan bu key'i gorebilir ve kullanabilir. Bu hem guvenlik hem de maliyet riski olusturur.

Dogru yapi:

```text
Browser -> Next.js API Route -> AI Provider API
```

Yanlis yapi:

```text
Browser -> AI Provider API
```

Bu nedenle Next.js'e gecmek burada degerli hale gelir.

## Onerilen Next.js API Akisi

Kullanici `Generate Promo Image` butonuna bastiginda:

1. Frontend form bilgilerini toplar.
2. Screenshot dosyasini alir.
3. Prompt metnini hazirlar veya server'a prompt icin gerekli ham bilgileri yollar.
4. Next.js API route bu istegi alir.
5. API route screenshotu ve form verilerini AI provider'a uygun formata cevirir.
6. AI provider image generation yapar.
7. API route sonucu frontend'e dondurur.
8. Frontend generated image preview gosterir.
9. Kullanici image'i indirebilir.

Onerilen endpoint:

```text
POST /api/generate-promo
```

Request tipi:

```text
multipart/form-data
```

Beklenen request alanlari:

- `appName`
- `category`
- `description`
- `targetAudience`
- `style`
- `screenshot`

Beklenen response:

```json
{
  "imageUrl": "https://...",
  "prompt": "Create a premium Instagram promotional image..."
}
```

Alternatif olarak image base64 de donebilir:

```json
{
  "dataUrl": "data:image/png;base64,...",
  "prompt": "Create a premium Instagram promotional image..."
}
```

## Prompt Builder Mantigi

Prompt frontend'de hazirlanabilir, ancak uzun vadede server tarafinda hazirlanmasi daha kontrolludur. Boylece prompt versiyonlama, stil kurallari ve model parametreleri merkezi olarak yonetilebilir.

Ornek server-side prompt:

```text
Create a premium Instagram promotional image for a mobile app.
Use the uploaded app screenshot as the main visual inside a modern smartphone mockup.
App name: {{appName}}.
Category: {{category}}.
Description: {{description}}.
Target audience: {{targetAudience}}.
Visual style: {{style}}.
Use a clean modern layout, premium SaaS aesthetic, soft lighting, high-quality composition, minimal text, and make it suitable for an Instagram launch post.
Output format: square Instagram post, 1080x1080.
```

Style secimine gore prompt ekleri:

Minimal SaaS:

```text
Use generous whitespace, subtle shadows, neutral colors, clean typography, and a polished B2B SaaS look.
```

Modern Gradient:

```text
Use a vibrant but premium gradient background, soft glow, glass-like depth, and a modern launch campaign composition.
```

Dark Tech:

```text
Use a dark futuristic interface mood, high contrast, neon accent lighting, and a premium developer-tool aesthetic.
```

App Store Launch:

```text
Make it feel like a polished App Store launch announcement with clear product focus and refined visual hierarchy.
```

Fun & Colorful:

```text
Use playful colors, energetic composition, friendly shapes, and a cheerful consumer-app launch feeling.
```

## Next.js Dosya Yapisi

Next.js App Router ile basit baslangic yapisi:

```text
app/
  page.tsx
  layout.tsx
  globals.css
  api/
    generate-promo/
      route.ts
components/
  PromoForm.tsx
  UploadDropzone.tsx
  StyleSelect.tsx
  GeneratedPreview.tsx
  PromptPreview.tsx
lib/
  buildPrompt.ts
  imageGeneration.ts
  types.ts
  validation.ts
```

Dosya sorumluluklari:

- `app/page.tsx`: Ana ekran ve sayfa layout'u.
- `components/PromoForm.tsx`: Form alanlari ve generate aksiyonu.
- `components/UploadDropzone.tsx`: Screenshot upload UI'i.
- `components/GeneratedPreview.tsx`: Generated image preview ve download.
- `app/api/generate-promo/route.ts`: Server-side image generation endpointi.
- `lib/buildPrompt.ts`: Prompt olusturma mantigi.
- `lib/imageGeneration.ts`: AI provider ile konusan servis.
- `lib/types.ts`: Form ve style tipleri.
- `lib/validation.ts`: Form ve upload validasyonu.

Bu yapi projeye eklenmistir.

## Gerekli Environment Degiskenleri

Next.js'e gecildiginde `.env.local` icinde tutulabilecek degerler:

```text
AI_PROVIDER_API_KEY=...
AI_PROVIDER_MODEL=...
MAX_UPLOAD_SIZE_MB=10
```

OpenAI kullanilacaksa ornek:

```text
OPENAI_API_KEY=...
```

Bu dosya git'e commit edilmemelidir.

## Upload Validasyonu

Ilk MVP icin onerilen kurallar:

- Sadece image dosyalari kabul edilmeli.
- Kabul edilen formatlar: PNG, JPG, JPEG, WebP.
- Maksimum dosya boyutu: 10 MB.
- En iyi sonuc icin portrait mobile screenshot onerilmeli.
- Bos form veya eksik screenshot ile generation baslatilmamali.

## Hata Durumlari

UI'da ele alinmasi gereken temel hata durumlari:

- Screenshot yuklenmedi.
- API istegi basarisiz oldu.
- AI provider timeout verdi.
- API limiti doldu.
- Donen cevapta image yok.
- Dosya boyutu cok buyuk.
- Dosya tipi desteklenmiyor.

Kullanicinin gorecegi hata metinleri sade olmali. Teknik hata detaylari console veya server logs tarafinda tutulmali.

## Gelistirme Yol Haritasi

Bir sonraki mantikli adimlar:

1. Mevcut statik MVP'yi referans al. Tamamlandi.
2. Projeyi Next.js App Router yapisina tasi. Tamamlandi.
3. Mevcut UI'i component'lere bol. Tamamlandi.
4. `POST /api/generate-promo` endpointini ekle. Tamamlandi.
5. Prompt builder'i `lib/buildPrompt.ts` icine tasi. Tamamlandi.
6. Upload validation ekle. Tamamlandi.
7. AI provider entegrasyonunu server tarafinda yap. Siradaki ana adim.
8. Generated image preview ve download akisini koru. Tamamlandi.
9. Daha sonra auth, database ve scheduling icin temel mimariyi genislet.

## Karar

Mevcut MVP ekran akisi ilk dogrulama icin yeterince iyi gorunuyor. Bundan sonraki gelistirme Next.js uzerinden devam etmelidir.

Sebep:

- Gercek AI API entegrasyonu server gerektirir.
- API key guvenli tutulmalidir.
- Upload ve image generation islemleri backend tarafinda daha saglikli yonetilir.
- Uzun vadede auth, database, generated image history, Instagram entegrasyonu ve scheduling ozellikleri Next.js uzerinde daha rahat buyur.
