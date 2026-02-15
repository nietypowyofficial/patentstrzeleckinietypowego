# Patent Strzelecki – Egzamin próbny

Aplikacja webowa do losowania próbnych testów zgodnie z zasadami egzaminu.

## Jak uruchomić

1. Otwórz plik `index.html` w przeglądarce.
2. Wybierz tryb (Egzamin/Trening) i kliknij „Losuj nowy test”.
3. Odpowiadaj kolejno na pytania: zaznacz odpowiedź i kliknij „Zatwierdź i dalej”.

## Plik do udostępniania

Gotowy, pojedynczy plik do wysyłki znajduje się tutaj:

- `patent-strzelecki.html`

Uwaga: wersja z logowaniem Netlify działa po hostingu na Netlify. Plik offline nie zapewnia realnej ochrony dostępu.

## Zasady testu

- Test ma 10 pytań jednokrotnego wyboru.
- Pierwsze 4 pytania są z UoBiA + bezpieczeństwa.
- Pozostałe 6 pytań to inne zagadnienia.
- W jednym teście pytania nie mogą się powtarzać.
- Zaliczenie: 4/4 poprawne w części UoBiA + bezpieczeństwo oraz maks. 1 błąd w pozostałych 6.

## Tryby

- **Egzamin** – z limitem czasu (domyślnie 20 min, można zmienić w UI).
- **Trening** – bez limitu czasu.
  
Po zakończeniu testu otrzymujesz wynik oraz listę poprawnych odpowiedzi.

## Baza pytań

- Źródło: załączony PDF `zestawy.pdf`.
- Baza znajduje się w `data/questions.json` i jest ładowana z `data/questions.js` (działa lokalnie bez serwera).
- Kategorie: `uobia`, `bezpieczenstwo`, `sport`, `budowa`.

Jeśli chcesz zmienić kategorię pytania, edytuj odpowiedni wpis w `data/questions.json`.
