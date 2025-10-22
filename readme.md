# SORA 2.5 Kalkulator

Dette prosjektet er en web-basert kalkulator for å beregne **SAIL (Specific Assurance and Integrity Level)** og **Containment** i henhold til SORA 2.5-rammeverket fra JARUS, tilpasset for Luftfartstilsynet.

## Funksjoner

Kalkulatoren består av to hoveddeler:

1.  **SAIL-kalkulator (`index.html`):**
    * Bestemmer **intrinsic Ground Risk Class (iGRC)** basert på UA-dimensjon, hastighet og populasjonstetthet.
    * Anvender **Ground Risk Mitigations (M1, M2)** for å finne **Final GRC**.
    * Kombinerer Final GRC med **residual Air Risk Class (ARC)** for å bestemme endelig **SAIL** (I-VI).

2.  **Containment-kalkulator (`containment.html`):**
    * Beregner nødvendig **Adjacent Area** basert på UA-hastighet.
    * Bestemmer nødvendig **Containment Robustness (Low, Medium, High)** basert på UA-størrelse, SAIL, populasjonstetthet i tilstøtende område og nærvær av utendørs folkesamlinger.

## Fargeprofil (Color Profile)

Prosjektet bruker en definert fargepalett for å sikre et konsistent visuelt uttrykk.

| Farge | HEX | RGB | Bruksområde |
| :--- | :--- | :--- | :--- |
| Mørk Blå | #03477F | 3, 71, 127 | Hovedfarge for overskrifter, primære tabellhoder, navigasjon. |
| Oransje | #F06C00 | 240, 108, 0 | Fremheving, knapper, aktiv navigasjon. |
| Dempet Grønn| #6A8E7F | 106, 142, 127 | Sekundære tabellhoder, hover-effekter. |
| Lys Himmelblå| #9ADFF3 | 154, 223, 243 | Potensiell fremtidig bruk for UI-elementer. |
| Veldig Lys Blå| #EEFAFF | 238, 250, 255 | Bakgrunnsfarge for seksjonsbokser. |
| Sort | #000000 | 0, 0, 0 | Brødtekst og generelle grenser. |
| Hvit | #FFFFFF | 255, 255, 255 | Bakgrunnsfarge for hovedinnhold, tekst i fargede hoder. |


## Kjøre prosjektet

Bare åpne `index.html` i en nettleser for å starte SAIL-kalkulatoren. Derfra kan du navigere til containment-kalkulatoren.