# Villa image hosting setup

Villa images are served by the Flask backend from `/media/villas/...`. The
backend upload endpoint saves files into the directory configured by
`UPLOAD_FOLDER`.

Villa cards try the filename stored in the database first, then the villa's
`utama.png`, and finally the shared `villa_1/utama.png` fallback. Make sure
the existing image directories are migrated along with the database.

For production:

1. Configure `UPLOAD_FOLDER` to a writable, persistent volume mounted on the
   backend, for example `/var/data/villa-images`. Do not use an ephemeral
   application/container directory if uploaded photos must survive a redeploy.
2. Copy the existing `permatawisata_fe/public/images/villas` image tree into
   that directory when migrating existing images.
3. Set `REACT_APP_API_BASE_URL` to the public backend URL when building the
   frontend if the frontend and backend use different domains, for example
   `https://api.example.com`. When they share an origin, this setting can be
   left unset.
4. Ensure the backend host allows browser requests from the frontend origin.

For local development, the frontend uses `http://localhost:5000` by default,
and the backend reads images from the frontend's public image directory.
