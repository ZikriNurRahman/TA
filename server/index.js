const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const { ClerkExpressWithAuth } = require("@clerk/clerk-sdk-node");

const app = express();
const server = http.createServer(app);

// Inisialisasi Socket.IO dan atur CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Izinkan semua origin, bisa diperketat nanti
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 3000;
const MONGO_URI =
  "mongodb+srv://zikrinurrahman_ta:9pzsQvnyIVL2cI45@clusterforta.csgnuz7.mongodb.net/?retryWrites=true&w=majority&appName=clusterForTA";
const CLERK_SECRET_KEY = "sk_test_DfnKANUCdEmTHrNMLOPL4vpIX1U32VO62Kjyao8XQt";

// supaya bisa cross port
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

// Middleware untuk memeriksa semua rute di bawah ini
// ClerkExpressWithAuth akan mengekstrak `userId` dari token dan menaruhnya di `req.auth.userId`
app.use(ClerkExpressWithAuth({ secretKey: CLERK_SECRET_KEY }));

// --- SKEMA DATABASE ---
const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  isOn: { type: Boolean, default: false },
  userId: { type: String, required: true, index: true },
});

const Device = mongoose.model("Device", deviceSchema);

// SKEMA testSession: Untuk menyimpan informasi setiap sesi percobaan
const testSessionSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Device",
    required: true,
  },
  startTime: { type: Date, default: Date.now },
});
const TestSession = mongoose.model("TestSession", testSessionSchema);

// Schema untuk menyimpan data performa
const performanceLogSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestSession",
    required: true,
  },

  delay: { type: Number, required: true }, // Delay dalam milidetik (ms)
  timestamp: { type: Date, default: Date.now },
});

const PerformanceLog = mongoose.model("PerformanceLog", performanceLogSchema);

const throughputLogSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestSession",
    required: true,
  },
  result: { type: Number, required: true }, // Hasil dalam perintah/detik
  timestamp: { type: Date, default: Date.now },
});
const ThroughputLog = mongoose.model("ThroughputLog", throughputLogSchema);

// --- RUTE API ---

app.get("/", (req, res) => {
  res.send(
    "Halo, ini adalah server untuk aplikasi iot online controller!, untuk info lebih lanjut hubungi zikrinur.official@gmail.com"
  );
});

// Endpoint untuk mendapatkan semua perangkat
app.get("/devices", async (req, res) => {
  try {
    if (!req.auth.userId)
      return res.status(401).json({ message: "Tidak terautentikasi" });

    // Filter berdasarkan userId dari token
    const devices = await Device.find({ userId: req.auth.userId });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data perangkat", error });
  }
});

// Endpoint untuk menambahkan perangkat baru
app.post("/devices", async (req, res) => {
  try {
    if (!req.auth.userId)
      return res.status(401).json({ message: "Tidak terautentikasi" });

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
      userId: req.auth.userId,
    });

    await newDevice.save(); // Simpan perangkat baru ke database
    // Note: Socket.IO belum diamankan, jadi emit ke semua dulu sementara
    io.emit("devices_updated"); // <-- KIRIM EVENT
    console.log(`Perangkat baru ditambahkan: ${name}`);
    res.status(201).json(newDevice); // Kirim kembali data perangkat yang baru dibuat
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan perangkat", error });
  }
});

// Endpoint untuk mendapatkan satu perangkat berdasarkan ID
app.get("/devices/:id", async (req, res) => {
  try {
    if (!req.auth.userId)
      return res.status(401).json({ message: "Tidak terautentikasi" });

    // Cari perangkat dengan ID tersebut DAN userId pemilik
    const device = await Device.findOne({
      _id: req.params.id,
      userId: req.auth.userId,
    });

    if (device) {
      res.json(device);
    } else {
      res.status(404).json({ message: "Perangkat tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data perangkat", error });
  }
});

// Endpoint untuk mengedit (update) nama perangkat
app.put("/devices/:id", async (req, res) => {
  try {
    if (!req.auth.userId)
      return res.status(401).json({ message: "Tidak terautentikasi" });

    const { name } = req.body; // Ambil nama baru dari body

    // validasi sederhana
    if (!name) {
      return res.status(400).json({ message: "Nama tidak boleh kosong" });
    }

    const device = await Device.findOneAndUpdate(
      { name: name }, // Data yang ingin diupdate
      { new: true }, // Opsi untuk mengembalikan dokumen yang sudah ter-update
      {
        _id: req.params.id,
        userId: req.auth.userId,
      }
    );

    if (device) {
      io.emit("devices_updated"); // <-- KIRIM EVENT
      console.log(`Perangkat diperbarui: ${device.name}`);
      res.json(device);
    } else {
      res
        .status(404)
        .json({ message: "Perangkat tidak ditemukan atau akses ditolak  " });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui perangkat", error });
  }
});

// Endpoint untuk menghapus perangkat berdasarkan ID
app.delete("/devices/:id", async (req, res) => {
  try {
    if (!req.auth.userId)
      return res.status(401).json({ message: "Tidak terautentikasi" });

    const device = await Device.findOneAndDelete({
      _id: req.params.id,
      userId: req.auth.userId,
    });

    if (device) {
      io.emit("devices_updated"); // <-- KIRIM EVENT
      console.log(`Perangkat dihapus: ${device.name}`);
      // Mengirim konfirmasi kembali ke client
      res.status(200).json({ message: "Perangkat berhasil dihapus" });
    } else {
      res
        .status(404)
        .json({ message: "Perangkat tidak ditemukan atau akses ditolak" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus perangkat", error });
  }
});

// Endpoint untuk mengubah status (toggle) perangkat berdasarkan ID
app.post("/devices/:id/toggle", async (req, res) => {
  try {
    if (!req.auth.userId)
      return res.status(401).json({ message: "Tidak terautentikasi" });

    const device = await Device.findOne({
      _id: req.params.id,
      userId: req.auth.userId,
    });

    if (device) {
      device.isOn = !device.isOn;
      await device.save(); // Simpan perubahan ke database
      io.emit("devices_updated"); // <-- KIRIM EVENT
      console.log(
        `Status ${device.name} diubah menjadi ${device.isOn ? "ON" : "OFF"}`
      );
      res.json(device);
    } else {
      res.status(404).send("Perangkat tidak ditemukan atau akses ditolak");
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal mengubah status perangkat", error });
  }
});

// --- RUTE API UNTUK SESI & LOG ---

// Endpoint untuk membuat sesi tes baru
app.post("/sessions", async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    const session = new TestSession({ deviceId });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: "Failed to create session", error });
  }
});

// Endpoint untuk mendapatkan semua riwayat sesi untuk satu perangkat
app.get("/devices/:deviceId/sessions", async (req, res) => {
  try {
    const sessions = await TestSession.find({
      deviceId: req.params.deviceId,
    }).sort({ startTime: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sessions", error });
  }
});

// Endpoint untuk menyimpan log performa baru untuk sebuah sesi
app.post("/logs", async (req, res) => {
  try {
    const { sessionId, delay } = req.body;
    if (!sessionId || delay == null) {
      return res
        .status(400)
        .json({ message: "sessionId and delay are required" });
    }
    const log = new PerformanceLog({ sessionId, delay });
    await log.save();

    // Kirim sinyal update log ke client melalui socket
    io.emit("log_updated", { sessionId });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: "Failed to save performance log", error });
  }
});

//  Endpoint untuk mendapatkan semua log untuk satu sesi tertentu
app.get("/sessions/:sessionId/logs", async (req, res) => {
  try {
    const logs = await PerformanceLog.find({
      sessionId: req.params.sessionId,
    }).sort({ timestamp: "asc" });
    res.json(logs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch logs for session", error });
  }
});

// Endpoint untuk menyimpan log throughput baru
app.post("/throughput-logs", async (req, res) => {
  try {
    const { sessionId, result } = req.body;
    if (!sessionId || result == null) {
      return res
        .status(400)
        .json({ message: "sessionId and result are required" });
    }
    const log = new ThroughputLog({ sessionId, result });
    await log.save();
    io.emit("throughput_log_updated", { sessionId });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: "Failed to save throughput log", error });
  }
});

// 6. Endpoint untuk mendapatkan log throughput dengan paginasi
app.get("/sessions/:sessionId/throughput-logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const logs = await ThroughputLog.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalLogs = await ThroughputLog.countDocuments({
      sessionId: req.params.sessionId,
    });
    const totalPages = Math.ceil(totalLogs / limit);

    res.json({
      logs,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch throughput logs", error });
  }
});

// SOCKET

// Logika koneksi Socket.IO
io.on("connection", (socket) => {
  console.log("⚡️ Seorang client telah terhubung");

  // listener untuk event 'ping'
  socket.on("ping", (callback) => {
    callback(); // Langsung panggil callback untuk dihitung oleh client
  });

  socket.on("toggle_device", async (deviceId, callback) => {
    try {
      const device = await Device.findById(deviceId);
      if (device) {
        device.isOn = !device.isOn;
        await device.save();
        // Kirim event update ke semua client
        io.emit("devices_updated");
        // Kirim balasan (acknowledgement) bahwa perintah sukses
        callback({ success: true, device });
      } else {
        callback({ success: false, message: "Device not found" });
      }
    } catch (error) {
      callback({ success: false, message: "Server error" });
    }
  });
  socket.on("disconnect", () => {
    console.log("🔌 Seorang client telah terputus");
  });
});

// Fungsi untuk terhubung ke DB dan menjalankan server
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Berhasil terhubung ke MongoDB!");

    server.listen(port, () => {
      console.log(`Server Smarthome berjalan di (ip):${port}`);
    });
  } catch (error) {
    console.error("Gagal terhubung ke database:", error);
    process.exit(1);
  }
};

startServer();
