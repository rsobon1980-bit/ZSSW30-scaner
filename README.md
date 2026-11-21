# ZSSW30 Scaner

Mobilna aplikacja PWA do lokalnej ewidencji numerów seryjnych urządzeń w wozach ZSSW-30.

## Funkcje
- Ekran główny z listą numerów rejestracyjnych wozów.
- Wyraźnie wyróżnione cztery kategorie główne: BZZ-01, BZ-05, KWN-01, DES-40.
- Rozwijane, wielopoziomowe podkategorie z odrębnym stylem dla każdego poziomu.
- Ręczne wpisywanie numerów seryjnych oraz OCR tekstu z aparatu.
- Opcjonalne komentarze do wozu i każdej podkategorii.
- Edycja i usuwanie zapisanych numerów.
- Eksport do pliku Excel: pojedynczy wóz lub wszystkie wozy (osobny arkusz dla każdego).
- Kopia zapasowa i przywracanie danych z pliku JSON.
- Lokalna baza IndexedDB; aplikacja nie wysyła ewidencji na serwer.
- Ilustracja poglądowa BWP Borsuk i KTO Rosomak z wieżami ZSSW-30.
- W nagłówku sam znak liścia na czarnym tle zamiast kwadratu z napisem Z30.
- Service worker umożliwia ponowne uruchamianie aplikacji offline po pierwszym załadowaniu.

## Publikacja na GitHub Pages
1. Wypakuj ZIP.
2. Wgraj **zawartość** folderu do głównego katalogu repozytorium GitHub (tam, gdzie jest README.md).
3. Zatwierdź zmiany (Commit changes).
4. W repozytorium wybierz **Settings → Pages**.
5. W sekcji Build and deployment wybierz **Deploy from a branch**, branch `main`, folder `/ (root)`, i zapisz.
6. Po zakończeniu publikacji otwórz adres GitHub Pages.

## Instalacja na telefonie
Otwórz adres strony w Chrome (Android) lub Safari (iPhone), a następnie wybierz „Dodaj do ekranu głównego” / „Zainstaluj aplikację”. Po aktualizacji odśwież stronę; jeśli aplikacja jest zainstalowana, zamknij ją i uruchom ponownie.

## Ważne informacje
- OCR i eksport XLSX korzystają z bibliotek pobieranych z CDN, więc przy pierwszym użyciu tych funkcji potrzebne jest połączenie z internetem.
- Dane IndexedDB są przypisane do przeglądarki i adresu strony. Czyszczenie danych przeglądarki może je usunąć — regularnie wykonuj kopię zapasową.
- Google Drive służy do ręcznego przechowywania pobranego pliku kopii; aplikacja nie synchronizuje się automatycznie z Drive.
- Do skanowania tekstu aparat musi być udostępniony przeglądarce. Po rozpoznaniu należy sprawdzić numer i zatwierdzić go.
- Ilustracja pojazdów ma charakter poglądowy i nie jest fotografią techniczną.
