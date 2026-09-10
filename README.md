# Qubi feladatkezelő

Mobil-first, telepíthető PWA emailes és Google-belépéssel, PostgreSQL szerveroldali tárolással és IndexedDB-alapú offline szinkronnal.

## Funkciók

- emailes regisztráció és tartós munkamenet
- időkorlátos, emailes elfelejtettjelszó-folyamat
- szerkeszthető profil, külön megszólítás és magyar/angol nyelv
- rendszermegosztással működő barátmeghívás
- opcionális Google OAuth 2.0 belépés
- felhasználónként elkülönített PostgreSQL-adatok
- offline feladatkezelés és automatikus újraszinkronizálás
- dátum, opcionális időpont és emlékeztető
- napi, heti kiválasztott napos, havi és éves ismétlődés opcionális záródátummal
- Tanulás, Otthon, Munka és Saját kategória külön Qubi-ruházattal
- telepíthető PWA alkalmazás-shell
- Web Push háttérértesítés rendszerhanggal
- választható vagy legfeljebb 1 MB-os feltölthető hang az alkalmazáson belüli jelzéshez

## Indítás Dockerrel

1. Másold le az `.env.example` fájlt `.env` néven, és adj meg erős adatbázis- és munkamenettitkot.
2. Google-belépéshez töltsd ki a `GOOGLE_CLIENT_ID` és `GOOGLE_CLIENT_SECRET` értékeket. Az engedélyezett callback URL: `https://qubi.vane.hu/auth/google/callback`.
3. Indítás: `docker compose up -d --build`.

Az alkalmazás health endpointja: `/api/health`.

## Szinkronizálás

A kliens minden változtatást azonnal IndexedDB-be ment. Internetkapcsolat esetén a teljes helyi változási állapot a felhasználó hitelesített `/api/sync` végpontjára kerül. A szerver felhasználónként végzi az upsertet; a frissebb kliensmódosítás nyer, és a törlések sírkőrekordként szinkronizálódnak.
