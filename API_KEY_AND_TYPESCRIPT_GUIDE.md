# API Key ve TypeScript Guide

Bu dokuman iki konuya odaklanir:

1. `lib/imageGeneration.ts` dosyasindaki API key mantigi nasil calisiyor?
2. Bu projede neden TypeScript kullandik?

Amac, ileride bu entegrasyonlari kendin yazabilecek seviyeye gelmen icin mantigi adim adim aciklamak.

## 1. API Key Nedir?

API key, bir servise "ben yetkili kullaniciyim" demek icin kullandigin gizli anahtardir.

Ornek:

```text
OPENAI_API_KEY=sk-...
AI_PROVIDER_API_KEY=...
```

Bu anahtarlar cok onemlidir cunku:

- Senin hesabina baglidir.
- Kullanim maliyeti yaratabilir.
- Baskasi ele gecirirse senin adina istek atabilir.
- Limitlerini tuketebilir.

Bu yuzden API key asla frontend koduna yazilmaz.

## 2. Neden API Key Frontend'e Konmaz?

Frontend kodu kullanicinin tarayicisina gider.

Yani su tarz bir kod yazarsan:

```ts
const apiKey = "my-secret-key";
```

bu key kullanicinin tarayicisinda gorulebilir hale gelir.

Kullanici bunu:

- Browser devtools ile
- Network tab ile
- Source dosyalarindan
- Build edilmis JavaScript icinden

gorebilir.

Bu nedenle secret degerler sadece server-side kodda kullanilir.

Dogru akim:

```text
Browser -> Bizim Next.js API route -> AI provider
```

Yanlis akim:

```text
Browser -> AI provider
```

## 3. Bu Projede API Key Nerede Duracak?

API key `.env.local` dosyasinda duracak.

Ornek:

```text
AI_PROVIDER=custom
AI_PROVIDER_ENDPOINT=https://your-provider-endpoint.example/generate
AI_PROVIDER_API_KEY=your_secret_key
MAX_UPLOAD_SIZE_MB=10
```

`.env.local` dosyasi local makinedeki gizli ayarlar icindir.

Bu dosya git'e commit edilmez. Biz `.gitignore` icine su patternleri ekledik:

```text
.env
.env.local
.env.*.local
```

Yani secret key yanlislikla repo'ya gitmesin diye korunuyor.

## 4. Next.js Environment Variable Mantigi

Next.js server tarafinda environment variable'lar soyle okunur:

```ts
process.env.AI_PROVIDER_API_KEY
```

Bu sadece server-side kodda guvenlidir.

Onemli kural:

`NEXT_PUBLIC_` ile baslayan environment variable'lar frontend'e acilir.

Ornek:

```text
NEXT_PUBLIC_APP_NAME=LaunchFrame AI
```

Bu frontend tarafinda gorulebilir.

Ama API key icin bunu yapmayiz:

```text
NEXT_PUBLIC_AI_PROVIDER_API_KEY=...
```

Bu yanlistir.

Secret key isimleri `NEXT_PUBLIC_` ile baslamamalidir.

## 5. `imageGeneration.ts` Dosyasinin Amaci

Dosya:

```text
lib/imageGeneration.ts
```

Bu dosyanin gorevi, AI image generation provider ile konusan servis katmani olmaktir.

Yani bu dosya su sorumlulugu alir:

- Hangi provider kullaniliyor?
- API endpoint nerede?
- API key var mi?
- Prompt ve screenshot provider'a nasil gonderilecek?
- Provider'dan donen image nasil normalize edilecek?

Bu mantigi route dosyasinin icine yazmak yerine ayri bir `lib` dosyasina koyduk. Boylece kod daha temiz ve buyutulebilir olur.

## 6. Mevcut `imageGeneration.ts` Kodu

Dosyanin ana yapisi su:

```ts
type GenerateImageInput = {
  prompt: string;
  screenshot: File;
};

type GenerateImageResult = {
  imageUrl?: string;
  dataUrl?: string;
};
```

Burada TypeScript type'lari ile fonksiyonun ne bekledigini ve ne dondurecegini tanimliyoruz.

`GenerateImageInput`:

- `prompt`: AI'a gonderilecek metin.
- `screenshot`: kullanicinin yukledigi image file.

`GenerateImageResult`:

- `imageUrl`: provider bir URL dondururse.
- `dataUrl`: provider base64 image veya data URL dondururse.

## 7. Ana Fonksiyon: `generatePromoImageWithProvider`

Kod:

```ts
export async function generatePromoImageWithProvider({
  prompt,
  screenshot,
}: GenerateImageInput): Promise<GenerateImageResult> {
  const provider = process.env.AI_PROVIDER || "";

  if (!provider) {
    return {};
  }

  if (provider === "custom") {
    return generateWithCustomEndpoint({ prompt, screenshot });
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}
```

Adim adim:

### Adim 1: Provider okunur

```ts
const provider = process.env.AI_PROVIDER || "";
```

Bu satir `.env.local` icindeki `AI_PROVIDER` degerini okur.

Ornek:

```text
AI_PROVIDER=custom
```

Eger `.env.local` icinde bu yoksa `provider` bos string olur.

### Adim 2: Provider yoksa fallback icin bos sonuc doner

```ts
if (!provider) {
  return {};
}
```

Bu cok bilerek yapildi.

Sebep:

Su anda gercek AI provider bagli olmayabilir. Ama uygulama demo edilebilsin istiyoruz.

Bu fonksiyon bos obje donunce API route sunu yapar:

```json
{
  "mode": "local-fallback",
  "prompt": "..."
}
```

Frontend de gercek AI image gelmedigini anlayip local canvas renderer ile gorsel uretir.

Yani provider yoksa uygulama tamamen bozulmaz.

### Adim 3: Provider `custom` ise custom endpoint fonksiyonu calisir

```ts
if (provider === "custom") {
  return generateWithCustomEndpoint({ prompt, screenshot });
}
```

Bu bize esneklik verir.

Ileride soyle provider modlari ekleyebiliriz:

```text
AI_PROVIDER=openai
AI_PROVIDER=replicate
AI_PROVIDER=stability
AI_PROVIDER=custom
```

Sonra kodda soyle genisletebiliriz:

```ts
if (provider === "openai") {
  return generateWithOpenAI({ prompt, screenshot });
}
```

### Adim 4: Bilinmeyen provider hata verir

```ts
throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
```

Eger `.env.local` icinde yanlis bir provider yazarsan:

```text
AI_PROVIDER=abc
```

uygulama sessizce yanlis calismak yerine net hata verir.

Bu debugging icin iyidir.

## 8. Custom Endpoint Fonksiyonu

Kod:

```ts
async function generateWithCustomEndpoint({ prompt, screenshot }: GenerateImageInput) {
  const endpoint = process.env.AI_PROVIDER_ENDPOINT;
  const apiKey = process.env.AI_PROVIDER_API_KEY;

  if (!endpoint) {
    throw new Error("AI_PROVIDER_ENDPOINT is required when AI_PROVIDER=custom.");
  }

  const payload = new FormData();
  payload.append("prompt", prompt);
  payload.append("screenshot", screenshot);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    body: payload,
  });

  if (!response.ok) {
    throw new Error("AI provider request failed.");
  }

  const result = await response.json();
  const base64Image = result.b64_json ? `data:image/png;base64,${result.b64_json}` : undefined;

  return {
    imageUrl: result.imageUrl || result.url,
    dataUrl: result.dataUrl || base64Image,
  };
}
```

Simdi bunu parcalayalim.

### Adim 1: Endpoint ve API key okunur

```ts
const endpoint = process.env.AI_PROVIDER_ENDPOINT;
const apiKey = process.env.AI_PROVIDER_API_KEY;
```

Bu degerler `.env.local` dosyasindan gelir.

Ornek:

```text
AI_PROVIDER_ENDPOINT=https://api.example.com/generate
AI_PROVIDER_API_KEY=secret_123
```

`endpoint`, istek atilacak URL'dir.

`apiKey`, bu endpoint'e yetkili oldugumuzu gosteren secret degerdir.

### Adim 2: Endpoint yoksa hata verilir

```ts
if (!endpoint) {
  throw new Error("AI_PROVIDER_ENDPOINT is required when AI_PROVIDER=custom.");
}
```

Provider `custom` secildiyse endpoint zorunludur.

Endpoint yoksa server nereye istek atacagini bilemez. Bu yuzden net hata verir.

### Adim 3: FormData hazirlanir

```ts
const payload = new FormData();
payload.append("prompt", prompt);
payload.append("screenshot", screenshot);
```

Image upload oldugu icin JSON yerine `FormData` kullaniyoruz.

`FormData`, dosya + text alanlarini birlikte gondermek icin uygundur.

Gonderilen alanlar:

- `prompt`
- `screenshot`

Provider tarafinda bu alanlar okunur ve image generation baslatilir.

### Adim 4: Provider'a POST istegi atilir

```ts
const response = await fetch(endpoint, {
  method: "POST",
  headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  body: payload,
});
```

Burada gercek API istegi yapilir.

`method: "POST"`:

Veri gonderdigimiz icin POST kullaniyoruz.

`headers`:

Eger API key varsa Authorization header'a eklenir.

```text
Authorization: Bearer secret_123
```

Bu cok yaygin bir API authentication yontemidir.

`body: payload`:

Prompt ve screenshot'u gonderir.

### Adim 5: Response basarili mi kontrol edilir

```ts
if (!response.ok) {
  throw new Error("AI provider request failed.");
}
```

`response.ok`, HTTP status 200-299 arasindaysa true olur.

Ornek:

- 200 OK -> true
- 201 Created -> true
- 400 Bad Request -> false
- 401 Unauthorized -> false
- 500 Server Error -> false

Provider hata dondururse biz de hata firlatiyoruz.

### Adim 6: JSON response okunur

```ts
const result = await response.json();
```

Provider'in dondurdugu JSON burada okunur.

Beklenen olasi response'lar:

```json
{
  "imageUrl": "https://..."
}
```

veya:

```json
{
  "dataUrl": "data:image/png;base64,..."
}
```

veya:

```json
{
  "b64_json": "..."
}
```

### Adim 7: Base64 image data URL'e cevrilir

```ts
const base64Image = result.b64_json ? `data:image/png;base64,${result.b64_json}` : undefined;
```

Bazi provider'lar sadece saf base64 string dondurur.

Frontend'de image olarak gosterebilmek icin bunu data URL formatina cevirmek gerekir:

```text
data:image/png;base64,...
```

### Adim 8: Sonuc normalize edilir

```ts
return {
  imageUrl: result.imageUrl || result.url,
  dataUrl: result.dataUrl || base64Image,
};
```

Farkli provider'lar farkli alan isimleri kullanabilir.

Kimisi:

```json
{ "imageUrl": "..." }
```

Kimisi:

```json
{ "url": "..." }
```

Kimisi:

```json
{ "dataUrl": "..." }
```

Kimisi:

```json
{ "b64_json": "..." }
```

Biz bunlari tek formata indiriyoruz:

```ts
{
  imageUrl?: string;
  dataUrl?: string;
}
```

Bu isleme normalize etmek denir.

## 9. API Key Akisinin Tam Resmi

En basit haliyle akis:

```text
.env.local
  |
  | process.env.AI_PROVIDER_API_KEY
  v
lib/imageGeneration.ts
  |
  | Authorization: Bearer ...
  v
AI Provider API
```

Kullanici API key'i hic gormez.

Browser sadece bizim Next.js endpointimize gider:

```text
POST /api/generate-promo
```

Bizim server API key ile provider'a gider.

## 10. `.env.local` Degisince Ne Yapmak Gerekir?

Next.js dev server environment variable'lari baslangicta okur.

Bu yuzden `.env.local` dosyasini degistirirsen genelde dev server'i yeniden baslatmalisin.

Yani:

1. Terminalde `Ctrl + C`
2. Sonra tekrar:

```bash
npm run dev
```

## 11. Neden Bu Mantigi Ayri Dosyada Tuttuk?

API provider kodunu direkt route icine de yazabilirdik.

Ama bu kotu buyur.

Ornek kotu yapi:

```text
route.ts icinde validation + prompt + provider + response mapping + error handling
```

Dosya siser ve okumasi zorlasir.

Biz su sekilde ayirdik:

```text
route.ts
  request/response yonetir

buildPrompt.ts
  prompt uretir

validation.ts
  input kontrol eder

imageGeneration.ts
  AI provider ile konusur
```

Bu daha profesyonel ve buyutulebilir bir yapidir.

## 12. TypeScript Nedir?

TypeScript, JavaScript'in tip sistemi eklenmis halidir.

JavaScript:

```js
function generate(input) {
  return input.prompt;
}
```

Bu fonksiyonun ne bekledigini koddan net anlayamazsin.

TypeScript:

```ts
type GenerateImageInput = {
  prompt: string;
  screenshot: File;
};

function generate(input: GenerateImageInput) {
  return input.prompt;
}
```

Burada artik fonksiyonun ne bekledigi bellidir.

## 13. Bu Projede Neden TypeScript Kullandik?

Bu proje buyuyebilecek bir SaaS urunu gibi tasarlaniyor.

Ileride sunlar gelecek:

- AI provider entegrasyonu
- Auth
- Database
- Instagram API
- Scheduling
- Generated image history
- Payment belki

Bu kadar buyuyen projede JavaScript ile yanlis veri sekilleri kolayca bug yaratabilir.

TypeScript bize sunlari verir:

- Form verisinin seklini biliriz.
- Style degerlerini sinirlariz.
- Fonksiyonlarin ne alip ne dondurdugunu goruruz.
- Refactor yaparken hatalar daha erken yakalanir.
- Editor autocomplete daha iyi calisir.
- Backend ve frontend arasindaki veri kontratlari daha net olur.

## 14. Projedeki TypeScript Ornekleri

### `PromoFormValues`

Dosya:

```text
lib/types.ts
```

Kod:

```ts
export type PromoFormValues = {
  appName: string;
  category: string;
  description: string;
  targetAudience: string;
  style: StyleName;
};
```

Bu bize formun seklini soyler.

Artik form verisi her yerde ayni sekilde kullanilir.

### `StyleName`

Kod:

```ts
export const styleOptions = [
  "Minimal SaaS",
  "Modern Gradient",
  "Dark Tech",
  "App Store Launch",
  "Fun & Colorful",
] as const;

export type StyleName = (typeof styleOptions)[number];
```

Bu guzel bir TypeScript numarasidir.

`StyleName` artik sadece su degerlerden biri olabilir:

```text
Minimal SaaS
Modern Gradient
Dark Tech
App Store Launch
Fun & Colorful
```

Yani yanlislikla sunu yazarsak TypeScript yakalayabilir:

```ts
style: "Random Style"
```

### `GenerateImageInput`

Dosya:

```text
lib/imageGeneration.ts
```

Kod:

```ts
type GenerateImageInput = {
  prompt: string;
  screenshot: File;
};
```

Bu sayede image generation fonksiyonuna prompt ve screenshot disinda yanlis bir sey vermememiz gerekir.

### `GenerateImageResult`

Kod:

```ts
type GenerateImageResult = {
  imageUrl?: string;
  dataUrl?: string;
};
```

Buradaki `?` isareti "opsiyonel" demektir.

Yani sonuc bazen `imageUrl` icerebilir, bazen `dataUrl` icerebilir, bazen provider yoksa bos obje donebilir.

Bu bizim local fallback mantigimizle uyumludur.

## 15. TypeScript Hangi Hatalari Onler?

Ornek hata:

```ts
generatePromoImageWithProvider({
  prompt: "hello",
});
```

Burada `screenshot` eksik.

TypeScript bunu yakalar:

```text
Property 'screenshot' is missing
```

Baska ornek:

```ts
const style: StyleName = "Cyberpunk";
```

Bu da hata olur, cunku `"Cyberpunk"` bizim izin verdigimiz style listesinde yok.

## 16. TypeScript Runtime Guvenlik Degildir

Onemli bir nokta:

TypeScript kod yazarken yardim eder. Ama runtime'da kullanicidan gelen veriye yine guvenemeyiz.

Bu yuzden `validation.ts` dosyasi hala gerekli.

Yani TypeScript sunu saglar:

```text
Developer yanlis kod yazmasin.
```

Validation sunu saglar:

```text
Kullanici veya dis dunya yanlis veri gonderirse server korunsun.
```

Ikisi farkli seylerdir.

## 17. Frontend'de TypeScript'in Faydasina Ornek

`PromoForm` component'i su prop'u alir:

```ts
type PromoFormProps = {
  values: PromoFormValues;
  onChange: <Field extends keyof PromoFormValues>(
    field: Field,
    value: PromoFormValues[Field],
  ) => void;
};
```

Bu biraz ileri seviye gorunebilir ama mantigi su:

Eger `field` olarak `style` gonderiyorsan, value da style tipinde olmali.

Eger `field` olarak `appName` gonderiyorsan, value string olmali.

Bu sayede form update fonksiyonu daha guvenli olur.

## 18. API Response Icin TypeScript Neden Onemli?

Provider farkli sekillerde image donebilir:

```json
{ "imageUrl": "https://..." }
```

veya:

```json
{ "dataUrl": "data:image/png;base64,..." }
```

Biz bunu TypeScript ile soyle ifade ediyoruz:

```ts
type GenerateImageResult = {
  imageUrl?: string;
  dataUrl?: string;
};
```

Bu, frontend'in ne bekleyebilecegini daha net hale getirir.

## 19. Bu Bilgiyle Ileride Neyi Kendin Yazabilirsin?

Bu mantigi anlarsan ileride su entegrasyonlari yazabilirsin:

- OpenAI image generation entegrasyonu
- Replicate API entegrasyonu
- Stability AI entegrasyonu
- Kendi backend image worker servisin
- Upload validation
- API key ile provider authentication
- Farkli response formatlarini tek formata normalize etme

Genel pattern hep ayni:

```text
1. Secret key'i .env.local icine koy.
2. Server-side dosyada process.env ile oku.
3. Frontend'den kendi API route'una istek at.
4. API route provider servis fonksiyonunu cagirsin.
5. Provider cevabini normalize et.
6. Frontend'e sade bir response dondur.
```

## 20. Kisa Ozet

API key mantigi:

- API key gizlidir.
- Frontend'e konmaz.
- `.env.local` icinde tutulur.
- Server-side kodda `process.env` ile okunur.
- Provider'a `Authorization` header'i ile gonderilir.

`imageGeneration.ts` mantigi:

- Provider secimini okur.
- Provider yoksa fallback icin bos sonuc doner.
- Custom provider varsa endpoint'e prompt + screenshot gonderir.
- Gelen response'u `imageUrl` veya `dataUrl` formatina normalize eder.

TypeScript mantigi:

- Kodun bekledigi veri sekillerini netlestirir.
- Hatalari daha kod yazarken yakalar.
- Buyuyen projede refactor ve entegrasyonlari daha guvenli yapar.
- Runtime validation'in yerine gecmez, onu tamamlar.

## 21. Local Fallback Nedir?

Local fallback, gercek AI provider bagli degilken veya provider image dondurmezken uygulamanin tamamen bozulmamasi icin kullandigimiz yedek gorsel uretim yoludur.

Bu projede local fallback su anlama gelir:

```text
AI image generation yoksa,
frontend canvas ile demo promo image uretir.
```

Yani kullanici yine formu doldurur, screenshot yukler, Generate butonuna basar ve ekranda bir promo image gorur. Ama bu image bir AI modeli tarafindan degil, bizim frontend kodumuzdaki canvas cizim fonksiyonlari tarafindan olusturulur.

## 22. Neden Local Fallback Ekledik?

Bu MVP'de henuz gercek AI provider bagli degil.

Eger fallback olmasaydi:

```text
Generate butonu -> API provider yok -> hata -> kullanici hicbir sey goremez
```

Bu kotu bir MVP deneyimi olurdu.

Fallback sayesinde:

```text
Generate butonu -> API provider yok -> prompt yine uretilir -> frontend canvas demo image uretir
```

Boylece:

- Ekran akisi test edilir.
- Form UX'i test edilir.
- Upload akisi test edilir.
- Preview ve download test edilir.
- AI provider baglanmadan demo yapilabilir.

## 23. Local Fallback Backend'de Nerede Basliyor?

Backend route:

```text
app/api/generate-promo/route.ts
```

Bu route, `generatePromoImageWithProvider()` fonksiyonunu cagirir:

```ts
const generated = await generatePromoImageWithProvider({
  prompt,
  screenshot: screenshotFile,
});
```

Bu fonksiyonun bulundugu dosya:

```text
lib/imageGeneration.ts
```

Orada su kisim var:

```ts
const provider = process.env.AI_PROVIDER || "";

if (!provider) {
  return {};
}
```

Bu ne demek?

`.env.local` icinde `AI_PROVIDER` yoksa `provider` bos string olur.

Yani:

```text
AI_PROVIDER tanimli degil
```

ise fonksiyon bos obje dondurur:

```ts
return {};
```

Bu bos obje su anlama gelir:

```text
Provider image uretmedi.
Frontend fallback'e gecebilir.
```

## 24. Backend Fallback Response'u Nasil Donuyor?

Route dosyasinda su response donuyor:

```ts
return NextResponse.json({
  ...generated,
  mode: generated.imageUrl || generated.dataUrl ? "provider" : "local-fallback",
  prompt,
});
```

Burada `generated` bos obje ise:

```ts
generated.imageUrl // yok
generated.dataUrl // yok
```

Bu yuzden `mode` su olur:

```text
local-fallback
```

Yani frontend'e giden response yaklasik soyle olur:

```json
{
  "mode": "local-fallback",
  "prompt": "Create a premium Instagram promotional image..."
}
```

Image yoktur, ama prompt vardir.

Bu onemli:

- Prompt backend tarafinda uretilmis olur.
- Frontend prompt'u kullaniciya gosterebilir.
- Image olmadigi icin frontend fallback renderer'i calistirir.

## 25. Frontend Fallback'e Nerede Geciyor?

Frontend akisinin ana dosyasi:

```text
components/PromoGenerator.tsx
```

Generate butonuna basilinca `handleSubmit` calisir.

Istekten sonra su kisim var:

```ts
if (result.imageUrl || result.dataUrl) {
  await renderExternalImage(result.imageUrl || result.dataUrl);
} else {
  renderLocalPromo(values, uploadedImage.image);
}
```

Bu karar noktasi cok onemli.

Eger API response icinde image varsa:

```json
{
  "imageUrl": "https://..."
}
```

veya:

```json
{
  "dataUrl": "data:image/png;base64,..."
}
```

o zaman:

```ts
renderExternalImage(...)
```

calisir.

Ama image yoksa:

```json
{
  "mode": "local-fallback",
  "prompt": "..."
}
```

o zaman:

```ts
renderLocalPromo(values, uploadedImage.image);
```

calisir.

Iste local fallback tam burada devreye girer.

## 26. `renderLocalPromo` Ne Yapiyor?

Fonksiyon:

```ts
const renderLocalPromo = (data: PromoFormValues, image: HTMLImageElement) => {
  const canvas = canvasRef.current;
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;

  const tokens = styleTokens[data.style];
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas, tokens);
  drawCopy(context, data, tokens);
  drawPhoneMockup(context, image, tokens);
  setGeneratedImageUrl(canvas.toDataURL("image/png"));
};
```

Adim adim:

### Adim 1: Canvas bulunur

```ts
const canvas = canvasRef.current;
```

React `useRef` ile canvas elementine erisiriz.

### Adim 2: Canvas context alinir

```ts
const context = canvas?.getContext("2d");
```

Canvas'a 2D cizim yapabilmek icin context gerekir.

### Adim 3: Canvas yoksa cikilir

```ts
if (!canvas || !context) return;
```

Bu guvenlik kontroludur.

### Adim 4: Secilen style'a gore renk tokenlari alinir

```ts
const tokens = styleTokens[data.style];
```

Ornek:

```text
Minimal SaaS
Dark Tech
Fun & Colorful
```

Her style'in kendi renkleri vardir.

### Adim 5: Canvas temizlenir

```ts
context.clearRect(0, 0, canvas.width, canvas.height);
```

Onceki generation varsa silinir.

### Adim 6: Background cizilir

```ts
drawBackground(context, canvas, tokens);
```

Bu fonksiyon gradient background, glow ve dekoratif cizgiler olusturur.

### Adim 7: App metinleri cizilir

```ts
drawCopy(context, data, tokens);
```

Bu fonksiyon sunlari canvas'a yazar:

- Category
- App Name
- Description
- Target Audience
- Launch now CTA

### Adim 8: Screenshot phone mockup icine cizilir

```ts
drawPhoneMockup(context, image, tokens);
```

Bu fonksiyon:

- Telefon cercevesi cizer.
- Screenshot'u telefon ekrani icine yerlestirir.
- Kenarlara highlight verir.

### Adim 9: Canvas PNG data URL'e cevrilir

```ts
setGeneratedImageUrl(canvas.toDataURL("image/png"));
```

Bu satir canvas icindeki gorseli PNG formatinda data URL'e cevirir.

Bu data URL daha sonra:

- Preview image state'i olarak kullanilir.
- Download butonunu aktif eder.

## 27. Fallback Canvas Hangi Boyutta?

Canvas su component'te tanimli:

```text
components/GeneratedPreview.tsx
```

Kod:

```tsx
<canvas ref={canvasRef} width={1080} height={1080} />
```

Yani uretilen image:

```text
1080 x 1080
```

Bu Instagram square post formatina uygundur.

CSS ile ekranda daha kucuk gorunebilir ama gercek canvas pixel boyutu 1080x1080'dir.

## 28. Fallback Download Nasil Calisiyor?

`renderLocalPromo` sonunda su state set edilir:

```ts
setGeneratedImageUrl(canvas.toDataURL("image/png"));
```

Bu deger `GeneratedPreview` component'ine gider:

```tsx
<GeneratedPreview generatedImageUrl={generatedImageUrl} />
```

Download butonu:

```tsx
<button disabled={!generatedImageUrl}>
  Download
</button>
```

Yani image yoksa disabled, image varsa aktif.

Tiklayinca:

```ts
const link = document.createElement("a");
link.href = generatedImageUrl;
link.download = "instagram-promo-image.png";
link.click();
```

Bu browser'a bir PNG indirme islemi baslatir.

## 29. Provider Hata Verirse Ne Olur?

`handleSubmit` icinde `try/catch` var.

Basit hali:

```ts
try {
  // API istegi
  // provider image varsa renderExternalImage
  // yoksa renderLocalPromo
} catch (error) {
  setErrorMessage(...);
  renderLocalPromo(values, uploadedImage.image);
}
```

Yani provider hata verse bile fallback calisir.

Bu davranis su acidan guzel:

- Kullanici tamamen bos ekranda kalmaz.
- Demo akisi bozulmaz.
- Hata mesaji gosterilir.
- Yine de bir preview uretilebilir.

Ama production'da bu davranisi daha dikkatli tasarlayabiliriz. Mesela:

- Gercek AI hatasi varsa kullaniciya "AI generation failed, showing preview fallback" denebilir.
- Fallback image ile AI image ayrimi UI'da belli edilebilir.
- Hata loglari server tarafinda tutulabilir.

## 30. Local Fallback ve Gercek AI Arasindaki Fark

Local fallback:

- Browser'da calisir.
- Canvas kullanir.
- Kullanicinin screenshotunu phone mockup icine yerlestirir.
- Deterministic'tir, yani ayni input benzer output verir.
- AI modeli degildir.
- Ucretsizdir.
- Hemen calisir.

Gercek AI generation:

- Server tarafindan provider'a istek atar.
- API key gerekir.
- Maliyet olusturabilir.
- Daha yaratici ve kaliteli kompozisyonlar uretebilir.
- Provider latency'si olabilir.
- Hata, rate limit ve timeout durumlari olabilir.

## 31. Neden Fallback'i Tamamen Kaldirmiyoruz?

Gercek AI baglandiktan sonra bile fallback faydali olabilir.

Sebep:

- Provider down olabilir.
- API limit dolabilir.
- Internet/API yavas olabilir.
- Demo ortaminda API key olmayabilir.
- Development sirasinda maliyet olmasin istenebilir.

Bu yuzden fallback'i tutmak iyi bir urun ve gelistirme stratejisidir.

Ama production'da kullaniciya bunun fallback oldugunu daha net gostermek gerekebilir.

## 32. Local Fallback Akisinin Kisa Ozeti

```text
Generate button
  |
  v
Frontend /api/generate-promo endpointine gider
  |
  v
Backend prompt uretir
  |
  v
AI_PROVIDER yoksa image donmez
  |
  v
Backend mode: local-fallback dondurur
  |
  v
Frontend imageUrl/dataUrl yok diye renderLocalPromo calistirir
  |
  v
Canvas uzerinde 1080x1080 promo image cizilir
  |
  v
Download butonu aktif olur
```
