# Beat Video Maker

Paikallinen verkkosivu, jolla voit yhdistää biitin ja kuvan ladattavaksi videoksi.

## Käyttö

1. Käynnistä palvelin:

   ```powershell
   & "C:\Users\Olli Kuivikko\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
   ```

2. Avaa selaimessa:

   ```text
   http://127.0.0.1:4173
   ```

3. Tiputa biitti ääni-alueelle.
4. Avaa Pinterest-paneelista haku, kopioi Pinterestissä valitun kuvan linkki ja paina `Liitä kopioitu linkki`.
5. Voit myös tiputtaa kuvan esikatselun päälle tai liittää Pinterest-/kuvalinkin käsin ja painaa `Hae`.
6. Valitse formaatti ja paina `Tee video`.
7. Lataa valmis tiedosto.

## Huomio

Sivu tekee MP4:n, jos selaimen MediaRecorder tukee MP4-tallennusta tällä koneella. Jos MP4 ei ole tuettu, sivu tekee WebM-videon varmuudeksi. Pinterest-linkkien haku toimii parhaiten suorilla kuvalinkeillä tai julkisilla pin-linkeillä, joista löytyy esikatselukuva.
