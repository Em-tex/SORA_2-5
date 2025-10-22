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

## Kjøre prosjektet

Bare åpne `index.html` i en nettleser for å starte SAIL-kalkulatoren. Derfra kan du navigere til containment-kalkulatoren.