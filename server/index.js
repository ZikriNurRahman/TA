const express = require("express");
const cors = require("cors");

const port = 3000;

// Data sementara untuk perangkat smarthome
let devices = [
  { id: 1, name: "Lampu Ruang Tamu", type: "light", isOn: false },
  { id: 2, name: "Lampu Kamar Tidur", type: "light", isOn: true },
  { id: 3, name: "Kipas Angin", type: "fan", isOn: false },
];

const app = express();
// supaya bisa cross port
app.use(cors());
app.use(express.json());

// Ketika aplikasi client mengakses alamat ini, server akan merespons.
app.get("/", (req, res) => {
  res.send("Halo, ini adalah server untuk aplikasi Smarthome!");
});

// Endpoint untuk mendapatkan semua perangkat
app.get("/devices", (req, res) => {
  res.json(devices);
});

// Endpoint untuk mengubah status (toggle) perangkat berdasarkan ID
app.post("/devices/:id/toggle", (req, res) => {
  const deviceId = parseInt(req.params.id, 10);
  const device = devices.find((d) => d.id === deviceId);

  if (device) {
    device.isOn = !device.isOn;
    console.log(
      `Status ${device.name} diubah menjadi ${device.isOn ? "ON" : "OFF"}`
    );
    res.json(device); // Kirim kembali status perangkat yang sudah diperbarui
  } else {
    res.status(404).send("Perangkat tidak ditemukan");
  }
});

// Menjalankan server pada port yang telah ditentukan
app.listen(port, () => {
  console.log(`Server Smarthome berjalan di http://localhost:${port}`);
});
