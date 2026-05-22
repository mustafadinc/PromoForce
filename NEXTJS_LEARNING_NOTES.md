# Next.js Learning Notes

Bu dokuman, LaunchFrame AI projesinde Next.js ile ne yaptigimizi anlamak icin hazirlandi. Amac sadece "hangi dosya var" demek degil; frontend nerede, backend nerede, API key nerede devreye girer, request nasil akar gibi temel mantigi netlestirmek.

## 1. Next.js Nedir?

Next.js, React uzerine kurulmus bir web framework'udur.

React normalde sadece frontend arayuz gelistirmek icin kullanilir. Next.js ise React'e ek olarak sunlari da verir:

- Sayfa routing sistemi
- Backend API route yazabilme
- Server-side kod calistirma
- Build ve deployment yapisi
- TypeScript destegi
- CSS ve asset yonetimi

Bu yuzden Next.js projelerinde hem frontend hem de backend'e benzeyen server-side parcalar ayni proje icinde bulunabilir.

## 2. Bu Projede Ne Yaptik?

Ilk once basit bir statik MVP yapmistik:

```text
index.html
src/app.js
src/styles.css
```

Sonra bunu Next.js yapisina tasidik.

Simdiki aktif uygulama su dosyalardan calisiyor:

```text
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    generate-promo/
      route.ts
components/
  PromoGenerator.tsx
  PromoForm.tsx
  GeneratedPreview.tsx
lib/
  buildPrompt.ts
  imageGeneration.ts
  types.ts
  validation.ts
```

Eski statik versiyonu silmedik. Referans olarak suraya tasidik:

```text
legacy-static-mvp/
```

## 3. Frontend Nerede?

Bu projede frontend, kullanicinin tarayicida gordugu ve etkilesime girdigi kisimdir.

Frontend dosyalari:

```text
app/page.tsx
components/PromoGenerator.tsx
components/PromoForm.tsx
components/GeneratedPreview.tsx
app/globals.css
```

### `app/page.tsx`

Ana sayfadir.

Su anda cok basit:

```tsx
import { PromoGenerator } from "@/components/PromoGenerator";

export default function Home() {
  return (
    <main className="shell">
      <PromoGenerator />
    </main>
  );
}
```

Yani ana sayfada `PromoGenerator` component'ini gosteriyoruz.

### `components/PromoGenerator.tsx`

Bu dosya frontend akisinin beynidir.

Burada sunlar olur:

- Form state'i tutulur.
- Screenshot secilir.
- Screenshot preview icin okunur.
- Generate butonuna basilinca `/api/generate-promo` endpoint'ine istek atilir.
- API'den image gelirse onu preview eder.
- API'den image gelmezse local canvas fallback ile gorsel uretir.

Dosyanin en basinda su ifade var:

```tsx
"use client";
```

Bu onemli.

Next.js App Router'da component'ler varsayilan olarak server component olabilir. Ama bu component tarayicida calismak zorunda, cunku:

- `useState` kullaniyor.
- `useRef` kullaniyor.
- File upload aliyor.
- Canvas cizimi yapiyor.
- Browser API'lerine erisiyor.

Bu nedenle `"use client"` dedik.

### `components/PromoForm.tsx`

Form UI'idir.

Icindeki alanlar:

- App Name
- Category
- Short Description
- Target Audience
- Style dropdown
- Screenshot upload
- Generate Promo Image butonu

Bu component sadece formu gosterir. Form state'inin asil sahibi `PromoGenerator.tsx` dosyasidir.

### `components/GeneratedPreview.tsx`

Generated image preview ve download butonu burada.

Bu component:

- 1080 x 1080 canvas'i gosterir.
- Image henuz yoksa empty state gosterir.
- Image olusunca Download butonunu aktif eder.
- Prompt metnini details alaninda gosterir.

### `app/globals.css`

Tum sayfanin CSS dosyasidir.

Modern dark SaaS tasarimi burada tanimli:

- Layout grid
- Form stilleri
- Upload alani
- Canvas preview alani
- Button stilleri
- Responsive kurallar

## 4. Backend Var Mi?

Evet, kucuk bir backend yapisi var.

Next.js'te backend endpointleri `app/api/.../route.ts` dosyalariyla yazilir.

Bu projedeki backend endpoint:

```text
app/api/generate-promo/route.ts
```

Bu dosya su route'u olusturur:

```text
POST /api/generate-promo
```

Yani frontend su adrese istek atar:

```ts
fetch("/api/generate-promo", {
  method: "POST",
  body: formData,
});
```

Bu kod browser'dan Next.js server tarafina gider.

## 5. Frontend ve Backend Ayni Projede Nasil Ayriliyor?

Next.js'te dosyanin nerede oldugu cok onemlidir.

Frontend gibi dusun:

```text
components/
app/page.tsx
app/globals.css
```

Backend gibi dusun:

```text
app/api/generate-promo/route.ts
lib/imageGeneration.ts
lib/validation.ts
lib/buildPrompt.ts
```

Ama `lib/` klasoru tek basina frontend ya da backend demek degildir. Nereden import edildigine gore degisir.

Mesela:

```text
lib/buildPrompt.ts
```

Hem frontend tarafinda fallback prompt gostermek icin kullaniliyor, hem backend tarafinda asil prompt uretmek icin kullaniliyor.

Ama:

```text
lib/imageGeneration.ts
```

Server tarafinda kullanilmasi gereken bir dosyadir, cunku API key ve provider request mantigi burada olacak.

## 6. API Key Nerede Devreye Giriyor?

API key kesinlikle frontend'e konmaz.

Yani sunu yapmayiz:

```tsx
const apiKey = "secret_key";
```

Frontend kodu kullanicinin tarayicisina gider. Oraya koyulan secret herkes tarafindan gorulebilir.

Dogru yer:

```text
.env.local
```

Ornek:

```text
AI_PROVIDER=custom
AI_PROVIDER_ENDPOINT=https://your-provider-endpoint.example/generate
AI_PROVIDER_API_KEY=your_secret_key
MAX_UPLOAD_SIZE_MB=10
```

Bu degerler server-side kodda okunur:

```ts
process.env.AI_PROVIDER_API_KEY
```

Bizim projede API key'in devreye girecegi dosya:

```text
lib/imageGeneration.ts
```

Orada su kisim var:

```ts
const endpoint = process.env.AI_PROVIDER_ENDPOINT;
const apiKey = process.env.AI_PROVIDER_API_KEY;
```

Bu kod browser'da degil, server tarafinda calismalidir.

## 7. Image Generation Akisi Nasil Calisiyor?

Kullanici `Generate Promo Image` butonuna basinca akis soyle:

1. Kullanici formu doldurur.
2. Screenshot upload eder.
3. `PromoGenerator.tsx` form verilerini toplar.
4. `FormData` olusturulur.
5. Frontend `/api/generate-promo` endpoint'ine `POST` istegi atar.
6. `app/api/generate-promo/route.ts` istegi alir.
7. Server form verilerini parse eder.
8. Server screenshot ve form verilerini validate eder.
9. Server `buildPrompt()` ile prompt uretir.
10. Server `generatePromoImageWithProvider()` fonksiyonunu cagirir.
11. AI provider ayarliysa provider'a istek atilir.
12. Provider image dondururse frontend bunu preview eder.
13. Provider yoksa frontend local canvas fallback ile demo gorseli uretir.

Basit sekil:

```text
Browser
  |
  | POST /api/generate-promo
  v
Next.js API Route
  |
  | build prompt + validate upload
  v
AI Provider
  |
  | imageUrl / dataUrl
  v
Browser Preview
```

## 8. Local Canvas Fallback Nedir?

Su anda gercek AI provider bagli olmayabilir. Buna ragmen uygulama demo edilebilsin diye frontend'de local canvas renderer var.

Bu kisim:

```text
components/PromoGenerator.tsx
```

icinde bulunur.

Yaptigi sey:

- Background cizer.
- App name ve description metinlerini yerlestirir.
- Screenshotu phone mockup icine koyar.
- Canvas'tan PNG uretir.

Bu gercek AI generation degildir. Ama MVP akisini gostermek icin cok faydalidir.

Gercek AI provider baglaninca local fallback yine kalabilir. Boylece API calismazsa demo tamamen bozulmaz.

## 9. `lib/buildPrompt.ts` Ne Yapar?

Bu dosya prompt uretir.

Formdan gelen degerler:

- appName
- category
- description
- targetAudience
- style

Bu degerlerle image generation API'ye uygun metin hazirlanir.

Style'a gore ek prompt da eklenir.

Ornek:

```ts
stylePromptAddons["Dark Tech"]
```

Dark Tech secildiyse prompt'a daha teknolojik, koyu ve neon his isteyen cumle eklenir.

## 10. `lib/validation.ts` Ne Yapar?

Bu dosya server tarafinda form ve upload kontrolu yapar.

Kontrol edilenler:

- App name bos mu?
- Category bos mu?
- Description bos mu?
- Screenshot var mi?
- Dosya tipi image mi?
- Dosya boyutu limitin altinda mi?

Bu kontroller server tarafinda onemlidir. Frontend'de kontrol olsa bile kullanici frontend'i bypass edebilir. Server her zaman tekrar kontrol etmelidir.

## 11. `lib/imageGeneration.ts` Ne Yapar?

Bu dosya gelecekte gercek AI provider ile konusacak servis katmanidir.

Su anda desteklenen mod:

```text
AI_PROVIDER=custom
```

Yani kendi image generation endpointimizi veya baska bir provider wrapper'ini buraya baglayabiliriz.

Akis:

1. `.env.local` icinden endpoint ve API key okunur.
2. Prompt ve screenshot provider'a gonderilir.
3. Provider image URL veya base64 image dondurur.
4. Bu sonuc frontend'e iletilir.

## 12. `.env.local` Nedir?

`.env.local`, local gelistirme ortaminda secret ve config degerlerini tutmak icin kullanilir.

Ornek:

```text
AI_PROVIDER=custom
AI_PROVIDER_ENDPOINT=https://your-provider-endpoint.example/generate
AI_PROVIDER_API_KEY=your_secret_key
MAX_UPLOAD_SIZE_MB=10
```

Bu dosya git'e atilmamalidir. Biz `.gitignore` icine ekledik.

Sebep:

- API key gizli kalmali.
- Her developer kendi local ayarini kullanabilir.
- Production ortaminda farkli environment variable kullanilabilir.

## 13. `package.json` Ne Ise Yarar?

`package.json`, projenin Node/Next.js tarafindaki kimlik ve dependency dosyasidir.

Icindeki onemli alan:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

Bu yuzden:

```bash
npm run dev
```

dedigimizde aslinda:

```bash
next dev
```

calisir.

## 14. `npm install` Ne Yapar?

`npm install`, `package.json` dosyasindaki paketleri indirir.

Bu projede ana paketler:

- `next`
- `react`
- `react-dom`
- `typescript`

Kurulumdan sonra `node_modules/` klasoru olusur.

`node_modules/` git'e atilmaz. Cunku cok buyuktur ve tekrar uretilebilir.

## 15. `npm run dev` Ne Yapar?

Development server baslatir.

Sonra uygulama genelde burada acilir:

```text
http://localhost:3000
```

Kod degisince Next.js otomatik yeniler.

## 16. `npm run build` ve `npm run start`

Production icin kullanilir.

Build almak:

```bash
npm run build
```

Build alinmis uygulamayi calistirmak:

```bash
npm run start
```

Gelistirme sirasinda genelde `npm run dev` kullanilir.

## 17. Bu Projede Su Anda Gercek AI Var Mi?

Hayir, henuz dogrudan baglanmis bir AI provider yok.

Ama altyapi hazir:

- API route var.
- Prompt builder var.
- Upload validation var.
- Provider servis dosyasi var.
- `.env.local` ile API key baglanabilecek.
- Frontend provider'dan gelen image'i preview edebilecek.

Yani siradaki is, hangi AI provider'i kullanacagimizi secip `lib/imageGeneration.ts` icindeki provider entegrasyonunu gercek API'ye gore tamamlamak.

## 18. Bir Sonraki Gelistirme Adimi

Bir sonraki teknik adimlar:

1. Hangi AI image provider kullanilacak karar ver.
2. `.env.local` dosyasini olustur.
3. API key'i `.env.local` icine koy.
4. `lib/imageGeneration.ts` icinde provider entegrasyonunu yaz.
5. `/api/generate-promo` endpointinden gercek image dondur.
6. Preview ve download akisini test et.

Bu adimdan sonra uygulama sadece canvas fallback degil, gercek AI-generated promo image uretecek hale gelir.

## 19. Kisa Ozet

Bu projede:

- Frontend React component'leriyle yazildi.
- Next.js App Router kullanildi.
- Backend benzeri API endpoint eklendi.
- Image generation icin server-side guvenli bir yol hazirlandi.
- API key'in frontend'e konmamasi saglandi.
- Prompt builder merkezi hale getirildi.
- Upload validation server tarafina alindi.
- Gercek AI provider baglanana kadar local canvas fallback korundu.

En onemli mantik:

```text
Frontend kullanicidan bilgiyi alir.
Backend API key ile guvenli sekilde AI provider'a gider.
Frontend sonucu preview ve download eder.
```
