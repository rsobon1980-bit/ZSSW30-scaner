# ZSSW30 Scaner

Mobilna aplikacja PWA do lokalnej ewidencji numerów seryjnych urządzeń w wozach ZSSW-30.

## Funkcje
- Ekran główny z listą numerów rejestracyjnych wozów.
- Wyraźnie wyróżnione cztery kategorie główne: BZZ-01, BZ-05, KWN-01, DES-40.
- Podkategorie poziomu 2 dodawane wyłącznie z kategorii głównej; bez możliwości tworzenia kolejnych poziomów. Istniejące starsze zagnieżdżone dane pozostają widoczne.
- Edycja nazwy i usuwanie podkategorii poziomu 2 z potwierdzeniem.
- Jeden numer seryjny na kategorię główną, wiele numerów w podkategoriach poziomu 2.
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

## Wersja v6
Nagłówek zawiera zdjęcia KTO Rosomak i BWP Borsuk oraz logo przesłane przez użytkownika.


## Zmiany v8
Na poziomie 2 i głębszych podkategoriach komentarz do konkretnego numeru seryjnego jest wyświetlany w tej samej ramce pod numerem. Ikona przy numerze otwiera edycję. Komentarze są zapisywane w IndexedDB, kopii JSON i osobnej kolumnie eksportu Excel. Liczniki numerów pozostają bez zmian.

## Zmiany v9
Komentarze do numerów seryjnych są wyświetlane w ramce pod numerem także w kategoriach głównych (poziom 1). Ikona umożliwia dodanie i edycję komentarza na każdym poziomie. Liczniki bez zmian.


## Wersja v10
Podkategorie od poziomu 2 mają przyciski edycji nazwy i usuwania. Usunięcie po potwierdzeniu obejmuje całą zawartość i podkategorie podrzędne.

## Wersja 11
- W każdej kategorii głównej można dodać tylko jeden numer seryjny. Po zapisaniu znika formularz ręcznego dodawania oraz przycisk skanowania; edycja i usuwanie pozostają dostępne.
- Podkategorie poziomu 2 i głębsze zachowują możliwość dodawania wielu numerów oraz edycję i usuwanie podkategorii.

## Wersja v13
- Kolorowe ikony: niebieska edycja i komentarz, czerwone usuwanie, turkusowe dodawanie, jasnoniebieski aparat.
- Przyciski edycji/usuwania podkategorii poziomu 2 są ikonami.
- Przycisk dodawania podkategorii dostępny tylko w kategorii głównej.
- Liczniki, ograniczenie jednego numeru w kategorii głównej, komentarze i eksport zachowane.


## Wersja 14
- Poziom 2: bez opcji dodawania kolejnych podkategorii.
- Edycja/usuwanie podkategorii i numerów seryjnych: kolorowe przyciski ikonowe.
- Wersjonowane pliki CSS/JS oraz sieciowo-pierwsze aktualizacje stron w service workerze.
- Dane IndexedDB nie są czyszczone podczas aktualizacji. Przed wgraniem zalecana kopia JSON.


## Wersja v16
Podkategorie poziomu 2 w BZ-05 (także Własna) mają limit jednego numeru seryjnego. Po zapisaniu numeru formularz dodawania i skanowania znika; po usunięciu wraca. Pozostałe podkategorie bez zmian.

## Wersja v17
- BZZ-01: lista podkategorii DIO01 - nowa, DIO01 - stara, Własna (ręczna nazwa).
- W każdej podkategorii BZZ-01 maksymalnie jeden numer seryjny; po usunięciu można dodać następny.
- BZ-05 zachowuje dotychczasową listę i limit jednego numeru.

## Wersja v18
- BZZ-01: wybór DIO01 lub Własna. Po wybraniu DIO01 drugie pole wyboru: stara / nowa. Nazwa zapisywana jako DIO01 - stara lub DIO01 - nowa.
- Pozostałe funkcje bez zmian.

## Wersja v19
BZ-05: wybór Master / Slave / Własna, następnie wersja stara/nowa dla Master albo stary/nowy dla Slave. Pozostałe funkcje bez zmian.


v20: Nagłówek podkategorii poziomu 2: nazwa, licznik, rozwijanie, komentarz, edycja i usuwanie w jednym rzędzie. Nazwa jest skracana wielokropkiem na wąskich ekranach.


## v21 — czytelne nazwy podkategorii
- Zmniejszone ikony i usunięte ich duże tła w nagłówkach podkategorii.
- Nazwy podkategorii mogą zawijać się do kolejnego wiersza zamiast obcinania wielokropkiem.
- Liczniki, rozwijanie i wszystkie funkcje bez zmian.


## v23
W podkategoriach DES-40 ukryto pola numerów seryjnych, skanowanie, listy numerów i liczniki. Pozostają Tak/Nie, komentarze, edycja i usuwanie. Historyczne numery pozostają w bazie i eksporcie. Kategoria główna DES-40 bez zmian.

## v24 — Excel DES-40
W podkategoriach DES-40 w kolumnie „Numer seryjny” eksportu Excel wpisywana jest odpowiedź Tak lub Nie. Główna kategoria DES-40 i pozostałe kategorie bez zmian. Historyczne numery pozostają w lokalnej bazie, lecz nie są eksportowane jako numery seryjne podkategorii DES-40.


## v25
DES-40: przycisk Zmień rozwija pole wyboru Tak/Nie z przyciskami Zapisz i Anuluj. Eksport Excel korzysta z zapisanej odpowiedzi.


## Wersja 26
- OCR etykiet: rozpoznawany jest tylko numer przy polu N/S; brak odczytu wymaga ponownego zdjęcia lub ręcznego wpisu.
- QR: skanowanie kamerą na żywo przy obsłudze BarcodeDetector oraz odczyt QR ze zdjęcia (jsQR jako alternatywa).
- Wynik obu trybów wymaga zatwierdzenia przed zapisaniem.
- Eksport Excel: nagłówek ZSSW30 - numer wozu, bez kolumny Wykonano (DES-40), z filtrem.
- OCR i biblioteki QR/Excel wymagają internetu przy pierwszym załadowaniu. Aparat wymaga HTTPS i zgody użytkownika.


## v27 — Motyw jasny i ciemny
W górnej części aplikacji dodano wybór Jasny / Dark Mode. Ustawienie jest przechowywane lokalnie w localStorage i nie zmienia danych pojazdów.


## v28 — wygląd
- Wybór motywu w ikonie obok TRYB LOKALNY; Jasny / Ciemny.
- Ciemny domyślnie dla nowych instalacji; zapamiętany wybór użytkownika jest zachowany.
