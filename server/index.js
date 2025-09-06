const express = require("express");
const app = express();
const port = 3000;

// Ini adalah "endpoint" atau "route" sederhana.
// Ketika aplikasi client mengakses alamat ini, server akan merespons.
app.get("/", (req, res) => {
  res.send("Halo, ini adalah server untuk aplikasi Smarthome!");
});

// Menjalankan server pada port yang telah ditentukan
app.listen(port, () => {
  console.log(`Server Smarthome berjalan di http://localhost:${port}`);
});
