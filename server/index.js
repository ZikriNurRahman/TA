const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const port = 3000;
const MONGO_URI =
  "mongodb+srv://zikrinurrahman_ta:9pzsQvnyIVL2cI45@clusterforta.csgnuz7.mongodb.net/?retryWrites=true&w=majority&appName=clusterForTA";

// supaya bisa cross port
app.use(cors());
app.use(express.json());

// 1. Definisi Schema (Struktur Data) dengan Mongoose
const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  isOn: { type: Boolean, default: false },
});

// 2. Buat Model dari Schema
const Device = mongoose.model("Device", deviceSchema);

// Ketika aplikasi client mengakses alamat ini, server akan merespons.
app.get("/", (req, res) => {
  res.send("Halo, ini adalah server untuk aplikasi Smarthome!");
});

// Endpoint untuk mendapatkan semua perangkat
app.get("/devices", async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data perangkat", error });
  }
});

// Endpoint untuk menambahkan perangkat baru
app.post("/devices", async (req, res) => {
  try {
    const { name, type } = req.body; // Ambil nama dan tipe dari body request

    // Validasi sederhana
    if (!name || !type) {
      return res
        .status(400)
        .json({ message: "Nama dan tipe perangkat harus diisi" });
    }

    const newDevice = new Device({
      name,
      type,
      isOn: false, // Perangkat baru selalu dalam keadaan mati
    });

    await newDevice.save(); // Simpan perangkat baru ke database
    console.log(`Perangkat baru ditambahkan: ${name}`);
    res.status(201).json(newDevice); // Kirim kembali data perangkat yang baru dibuat
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan perangkat", error });
  }
});

// Endpoint untuk mengubah status (toggle) perangkat berdasarkan ID
app.post("/devices/:id/toggle", async (req, res) => {
  try {
    const deviceId = req.params.id;
    const device = await Device.findById(deviceId);

    if (device) {
      device.isOn = !device.isOn;
      await device.save(); // Simpan perubahan ke database
      console.log(
        `Status ${device.name} diubah menjadi ${device.isOn ? "ON" : "OFF"}`
      );
      res.json(device);
    } else {
      res.status(404).send("Perangkat tidak ditemukan");
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal mengubah status perangkat", error });
  }
});

// Endpoint untuk mengedit (update) nama perangkat
app.put("/devices/:id", async (req, res) => {
  try {
    const { name } = req.body; // Ambil nama baru dari body
    if (!name) {
      return res.status(400).json({ message: "Nama tidak boleh kosong" });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { name: name }, // Data yang ingin diupdate
      { new: true } // Opsi untuk mengembalikan dokumen yang sudah ter-update
    );

    if (device) {
      console.log(`Perangkat diperbarui: ${device.name}`);
      res.json(device);
    } else {
      res.status(404).json({ message: "Perangkat tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui perangkat", error });
  }
});

// Endpoint untuk mendapatkan satu perangkat berdasarkan ID
app.get("/devices/:id", async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (device) {
      res.json(device);
    } else {
      res.status(404).json({ message: "Perangkat tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data perangkat", error });
  }
});

// Endpoint untuk menghapus perangkat berdasarkan ID
app.delete("/devices/:id", async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);

    if (device) {
      console.log(`Perangkat dihapus: ${device.name}`);
      // Mengirim konfirmasi kembali ke client
      res.status(200).json({ message: "Perangkat berhasil dihapus" });
    } else {
      res.status(404).json({ message: "Perangkat tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus perangkat", error });
  }
});

// Fungsi untuk terhubung ke DB dan menjalankan server
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Berhasil terhubung ke MongoDB!");

    // Cek apakah ada data, jika tidak ada, tambahkan data awal
    const deviceCount = await Device.countDocuments();
    if (deviceCount === 0) {
      await Device.insertMany([
        { name: "Lampu Ruang Tamu", type: "light", isOn: false },
        { name: "Lampu Kamar Tidur", type: "light", isOn: true },
        { name: "Kipas Angin", type: "fan", isOn: false },
      ]);
      console.log("Data awal berhasil ditambahkan ke MongoDB.");
    }

    app.listen(port, () => {
      console.log(`Server Smarthome berjalan di http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Gagal terhubung ke database:", error);
    process.exit(1);
  }
};

startServer();
