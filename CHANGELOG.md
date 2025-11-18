# Changelog

## [Unreleased]

## [0.1.0] - 2025-11-14

### Added
- Teklif PDF'lerine Genel Ayarlar'daki kurum **logo** ve **kaşe** bilgilerinin bağlanması.
  - `/settings` sayfasında yüklenen `companyLogo` ve `companyStamp` değerleri artık:
    - Teklif listesi `/quotes` üzerinden açılan PDF'lerde,
    - Teklif detay sayfası `/quotes/[id]` üzerindeki "PDF Görüntüle" aksiyonunda,
    - Yeni teklif oluşturma akışında PDF üretiminde
  otomatik olarak kullanılıyor.

- Teklif detay sayfasında tarih ve notların inline düzenlenebilmesi.
  - "Oluşturma Tarihi" ve "Geçerlilik Tarihi" alanları artık tıklanarak `date` input üzerinden değiştirilebiliyor.
  - "Notlar" alanı tıklanınca textarea açılıyor; blur ile `notes` alanı güncelleniyor.

- Teklif detay sayfasında kalemlerin inline düzenlenmesi.
  - Kalem tablosunda **Miktar** ve **Birim Fiyat** hücreleri tıklanarak düzenlenebiliyor.
  - Değişiklikler `/api/quote-items/[id]` PATCH endpoint'i üzerinden kaydediliyor.
  - Her güncellemede kalem toplamı ile teklifin `subtotal`, `tax` ve `total` alanları yeniden hesaplanıyor.

- Teklif kalemleri için silme fonksiyonu.
  - Her kalem satırının sonunda "Sil" aksiyonu eklendi.
  - Silme işlemi `/api/quote-items/[id]` DELETE endpoint'i ile yapılıyor ve teklif toplamları yeniden hesaplanıyor.

- Teklif detay sayfasına **"Kalem Ekle"** özelliği.
  - "Teklif Kalemleri" kartında sağ üstte "Kalem Ekle" butonu ve dialog eklendi.
  - Dialog üzerinden açıklama, miktar ve birim fiyat girilerek `/api/quotes/[id]/items` POST endpoint'i ile yeni kalem oluşturuluyor.
  - Başarılı ekleme sonrası teklif yeniden yüklenerek kalem listesi ve toplamlar güncelleniyor.

- Sağlık Testleri (`/health-tests`) sayfasında detay dialogu.
  - Her satırda **Bilgi/Detay** aksiyonu ile açılan dialog üzerinden test adı, kodu, fiyatı, açıklaması, durum ve oluşturulma/güncellenme tarihleri okunabilir hale getirildi.

- Sağlık Testleri sayfasında filtre sonrası boş sonuçlar için geliştirilmiş boş durum ekranı.
  - Filtreler nedeniyle sonuç çıkmadığında kullanıcıya açıklayıcı mesaj ve **"Filtreleri Temizle"** butonu gösteriliyor.

- Sağlık Testleri için Excel tabanlı toplu ekleme/güncelleme (upsert) akışı iyileştirmeleri.
  - **Örnek Şablon İndir** aksiyonu artık sistemde kayıtlı testleri de şablona dahil ediyor.
  - Yüklenen dosya satırları önizleme ekranında listeleniyor, geçersiz kayıtlar için hata mesajları gösteriliyor.
  - Gönderim sonrasında her satır için mevcut test bulunursa güncelleme, bulunamazsa yeni kayıt oluşturma (upsert) yapılıyor.

- Kullanıcı Yönetimi (`/users`) sayfasında Excel (XLSX) export özelliği.
  - Önceki CSV export aksiyonu **Excel Export** olarak güncellendi.
  - Kullanıcı listesi `ID`, `Ad Soyad`, `E-posta`, `Rol`, `Departman`, `Telefon`, `Durum`, `Son Giriş`, `Kayıt Tarihi` sütunlarıyla düzenli bir Excel dosyası olarak indiriliyor.
  - XLSX kütüphanesi kullanılarak `.xlsx` formatında dosya üretimi ve kolon genişlikleri okunabilir olacak şekilde ayarlandı.

### Changed
- Teklif PDF ve detay sayfasındaki **KDV oranı** artık dinamik hesaplanıyor.
  - KDV satırında `tax / subtotal` oranı kullanılarak `KDV (%X)` formatında gösterim yapılıyor.
  - Önceki sabit `%20` gösterimi kaldırıldı.

### Fixed
- Teklif detay sayfasında KDV satırında yanlış oran gösterilmesi (her zaman %20) sorunu giderildi.
- PDF üretiminde kurum logosu ve kaşesinin bazı akışlarda görünmemesi sorunu düzeltildi.
  - Özellikle yeni teklif oluşturma akışında `companyInfo` parametresinin eksik gönderilmesi giderildi.

