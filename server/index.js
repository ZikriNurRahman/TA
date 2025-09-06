const express = require("express");
const cors = require("cors");

const port = 3000;

const app = express();
// supaya bisa cross port
app.use(cors());

// Ketika aplikasi client mengakses alamat ini, server akan merespons.
app.get("/", (req, res) => {
  res.send("Halo, ini adalah server untuk aplikasi Smarthome!");
});

// Menjalankan server pada port yang telah ditentukan
app.listen(port, () => {
  console.log(`Server Smarthome berjalan di http://localhost:${port}`);
});
