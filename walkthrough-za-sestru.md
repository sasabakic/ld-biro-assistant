# Tvoj dan sa alatom — kako bi izgledalo

*Pročitaj ovo zamišljajući da već koristiš alat. Posle mi reci: gde si pomislila "ovo bi mi pomoglo," gde si pomislila "ovo nikad neću koristiti," šta fali, šta je glupo. Iskreno reagovanje vredi više od pristojnog "OK super." Nije sve još napravljeno — pitamo te pre nego što počnemo.*

---

## 08:30 — Stigla si u kancelariju

Otvaraš aplikaciju na laptopu. Prvo što vidiš je **Danas** — filter koji prikazuje samo ono što treba da uradiš ili pratiš danas. Sve ostalo je sklonjeno.

```
┌─ LD Biro — TABLA ─────────────────────────────────────────┐
│  [Sve]  [● Danas]  [Sutra]  [Nedelja]    🎤 Snimi novo   │
├──────────┬───────────┬────────────────┬───────────────────┤
│ INBOX    │ U TOKU    │ ČEKA KLIJENTA  │ GOTOVO            │
├──────────┼───────────┼────────────────┼───────────────────┤
│ 📞 Lukić │ 📋 PDV    │ 📋 Stojanović  │                   │
│ javiću se│ Petrović  │ čeka izvod     │                   │
│ jutros   │ rok 15.5  │ od 9.5         │                   │
│          │           │                │                   │
│ 📋 PDV   │ 📞 Janić  │                │                   │
│ Marković │ javiću se │                │                   │
│ rok 15.5 │ za savet  │                │                   │
└──────────┴───────────┴────────────────┴───────────────────┘
```

Ikonice na karticama:
- 📞 = **Javiću se** (kratak povratni kontakt)
- 📋 = **Zaduženje** (posao sa rokom)

Pet stavki za danas. Znaš tačno šta te čeka. Mozak ne mora da pamti.

---

## 08:45 — Prvi poziv (Marković, brzi savet)

Marković zove, pita kako da knjiži trošak goriva. Odgovaraš mu u toku poziva. Pitanje rešeno na licu mesta.

Posle poziva, telefon ti je još u ruci. Otvaraš aplikaciju na telefonu. Jedno veliko dugme:

```
┌────────────────────────┐
│                        │
│         🎤             │
│   Drži i pričaj        │
│                        │
└────────────────────────┘
```

Pritisneš i kažeš:
> *"Marković, pitao za knjiženje goriva, rekla mu konto 513, rešeno"*

Pustiš dugme. Aplikacija ti za 2 sekunde pokaže šta je razumela:

```
┌─ Nova kartica ─────────────────────┐
│ Klijent:  Marković d.o.o.          │
│ Tip:      📞 Pitanje                │
│ Status:   ✅ Gotovo                 │
│ Beleška:  gorivo → konto 513       │
│                                    │
│ [Sačuvaj]  [Izmeni]                │
└────────────────────────────────────┘
```

Sačuvaj. Kartica ide direktno u **Gotovo**. Razlog za beleženje i rešenih pitanja: za pola godine kad Marković ponovo pita "šta smo rekli za gorivo," imaš zapis.

---

## 09:10 — Drugi poziv (Petrović, novo zaduženje)

Petrović diktira brojke za majski PDV. 4 minuta razgovor. Posle poziva, opet glasovna:

> *"Petrović, novi zadatak, PDV za maj, rok 15. juni, brojke ću prebaciti iz mejla koji mi šalje"*

```
┌─ Nova kartica ─────────────────────┐
│ Klijent:  Petrović s.p.            │
│ Tip:      📋 Zaduženje              │
│ Rok:      15. jun 2026             │
│ Beleška:  PDV maj, brojke u mejlu  │
│                                    │
│ [Sačuvaj]  [Izmeni]                │
└────────────────────────────────────┘
```

Pošto rok nije danas, kartica pada u **Inbox** ali se ne pojavljuje u "Danas" filteru — vraća se kad si spremna da je radiš.

---

## 09:25 — Telefon zvoni dok kucaš PDV

Janković. Pita nešto komplikovano oko vraćene izlazne fakture. Ne možeš odmah, kažeš mu: *"Javiću ti se posle 15h, treba mi 10 minuta da pogledam."*

Ovo je tačno onaj momenat gde ti pre stvari ispadaju iz glave. Sada — pre nego što se vratiš PDV-u — pritisneš mic dugme:

> *"Janković, javiću se posle 15h za vraćenu izlaznu fakturu, treba odgovor pre 16h"*

```
┌─ Nova kartica ─────────────────────┐
│ Klijent:  Janković d.o.o.          │
│ Tip:      📞 Javiću se              │
│ Planirano za:  Danas, posle 15h    │
│ Rok:      Danas, do 16h            │
│ Beleška:  vraćena izlazna faktura  │
│                                    │
│ [Sačuvaj]  [Izmeni]                │
└────────────────────────────────────┘
```

Kartica pada u **Inbox**, ali pošto je za danas, automatski se pojavljuje i u **Danas** filteru. Nazad na Petrovićev PDV. Glava prazna.

---

## 10:00 — Stojanović šalje tiket sam, preko portala

Stojanović je ranije naučio da koristi klijentski portal. On otvara link, vidi svoja četiri tiketa:

```
┌─ Stojanović d.o.o. — Moji zahtevi ───────────────────┐
│  [+ Novi zahtev]                                      │
├───────────────────────────────────────────────────────┤
│ #112  Predaja PDV-a za april        ✅ Gotovo         │
│ #119  Pitanje o ulaznoj fakturi     🔵 U radu         │
│ #124  Banka: izvod za maj            🟡 Čeka tebe     │
│ #127  Završni račun 2025             🔵 U radu        │
└───────────────────────────────────────────────────────┘
```

On vidi pojednostavljen prikaz — *Primljeno / U radu / Čeka tebe / Gotovo*. Ne vidi tvoje interne kolone, ne vidi druge klijente, ne vidi tvoje beleške.

Klikne **+ Novi zahtev**, otkuca:
> *"Treba mi potvrda da nemam dugovanja prema PURS, hitno za tender"*

Doda fajl. Pošalje. Tiket dolazi tebi u **Inbox**. Bez poziva. Bez prekidanja.

Ti vidiš:
```
┌─ Inbox ────────────────────────────────────┐
│ 🆕 PORTAL  Stojanović d.o.o.               │
│ "Potvrda o nedugovanju za tender"          │
│ priložen 1 fajl   pre 3 minuta             │
└────────────────────────────────────────────┘
```

**Ovo je pravi cilj portala**: jedan poziv manje danas. Ne svi klijenti će ga koristiti, ali oni koji nauče — neće te zvati za stvari koje mogu napisati.

---

## 11:00 — Mesečne stvari same izlaze

Sećaš se da svakog meseca moraš da računaš PDV za 70 stalnih klijenata? Ne moraš ih ručno unositi.

Prvog u mesecu sistem je za svakog stalnog klijenta automatski napravio karticu *"PDV [mesec], rok 15."* — već stoje u Inbox-u, čekaju te. Kada počneš da radiš nečiji PDV, samo prevučeš karticu u **U toku**.

Ista logika za kvartalne stvari, završne račune, sve što se ponavlja.

---

## 13:00 — Pauza, brzi pregled

Klikneš **Danas**. Ploča se redukuje:

```
┌──────────┬───────────┬────────────┬───────────────┐
│ INBOX    │ U TOKU    │ ČEKA       │ GOTOVO        │
├──────────┼───────────┼────────────┼───────────────┤
│ 📞 Janić │ 📋 PDV    │            │ 📞 Marković   │
│ posle 15 │ Petrović  │            │ ✅ rešeno     │
│          │           │            │               │
│ 🆕 Stoj. │           │            │               │
│ portal   │           │            │               │
└──────────┴───────────┴────────────┴───────────────┘
```

3 stvari preostale, jedna gotova. Idi na ručak mirno.

---

## 13:30 — 15:00 — Talas poziva

6 poziva u 90 minuta. Posle svakog — glasovna beleška, 5 sekundi rada. Aplikacija raste, glava ne. Neki su rešeni odmah (Gotovo direktno), neki Javiću se, neki nova zaduženja sa rokovima sledeće nedelje.

---

## 15:30 — Vraćaš se Jankoviću

Otvoriš **Danas**. Vidiš karticu *"Janković — javiću se za vraćenu fakturu, rok 16h."* Klikneš. Otvori se beleška od jutros — *"vraćena izlazna faktura."* Setiš se odmah šta je problem. Pozoveš. Razgovor 7 minuta. Posle poziva: glasovna *"Janković, rešeno, fakturu sam ispravila i poslala"* → kartica ide u **Gotovo**.

Bez tog zapisa od jutros, ova kartica bi prestala da postoji u glavi do utorka.

---

## 17:00 — Kraj dana, 60 sekundi

Otvoriš **Danas**. Aplikacija ti pokaže šta nije završeno:

```
┌─ Šta sa ovim do kraja dana? ────────────────────────┐
│                                                     │
│ 📋 PDV Petrović       [Pomeri za sutra] [Završi]    │
│    (i dalje u "U toku")                             │
│                                                     │
│ 📋 Stojanović portal  [Pomeri za sutra] [Završi]    │
│    (još u Inbox-u)                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Dva klika — pomeriš za sutra. Sve drugo je obrađeno.

Zatvoriš laptop. U glavi nema *"jao, šta sam danas zaboravila."* Sve što treba da znaš je u alatu. Ono što je za sutra — sutra će ti se pojaviti u **Danas** filteru, kao da nikad nisi ni razmišljala o tome.

---

## Šta hoćemo da ti kažeš

1. **Gde si pomislila "ovo bi mi pomoglo"?** Konkretno koji deo.
2. **Gde si pomislila "ne, ovo nikad neću koristiti"?** Iskreno.
3. **Šta fali?** Nešto što radiš svaki dan a nije pokriveno.
4. **Imena kolona** — Inbox / U toku / Čeka klijenta / Gotovo. Da li se slažu sa tvojom glavom? Da li ti treba i "Čeka treću stranu" (banka, PURS)? Da li ti treba "Hitno"?
5. **Glasovne beleške** — da li bi stvarno koristila, ili više voliš da kucaš? Iskreno.
6. **Klijentski portal** — koliko tvojih klijenata bi *stvarno* otvorilo i koristilo? Procenjuj realno, ne idealno.
