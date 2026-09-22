import express from "express";
import cors from "cors";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = 17891;

// ==========================================
// CORS
// ==========================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
  })
);

// ==========================================
// JSON
// ==========================================

app.use(
  express.json({
    limit: "10mb",
  })
);

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "MarketBaza Printer Service",
    version: "1.0.0",
    port: PORT,
  });
});

// ==========================================
// HEALTH
// ==========================================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "MarketBaza Printer Service",
    platform: process.platform,
    port: PORT,
  });
});

// ==========================================
// WINDOWS PRINTERLARINI OLISH
// ==========================================

app.get("/printers", async (req, res) => {
  try {
    if (process.platform !== "win32") {
      return res.status(400).json({
        ok: false,
        message:
          "MarketBaza Printer Service hozircha Windows uchun ishlaydi.",
      });
    }

    const powershellCommand = `
      $printers = Get-Printer |
        Select-Object Name, DriverName, PortName, PrinterStatus, Type, Shared;

      if ($printers) {
        $printers | ConvertTo-Json -Compress
      }
    `;

    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        powershellCommand,
      ],
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const output = stdout.trim();

    if (!output) {
      return res.json({
        ok: true,
        printers: [],
      });
    }

    let printers = JSON.parse(output);

    if (!Array.isArray(printers)) {
      printers = [printers];
    }

    const result = printers.map((printer) => ({
      name: printer.Name || "",
      driverName: printer.DriverName || "",
      portName: printer.PortName || "",
      status: printer.PrinterStatus ?? null,
      type: printer.Type || "",
      shared: Boolean(printer.Shared),
    }));

    res.json({
      ok: true,
      printers: result,
    });
  } catch (error) {
    console.error("");
    console.error("=================================");
    console.error(" PRINTERLARNI OLISHDA XATO");
    console.error("=================================");
    console.error(error);
    console.error("");

    res.status(500).json({
      ok: false,
      message:
        error.message ||
        "Windows printerlarini olishda xatolik yuz berdi.",
    });
  }
});

// ==========================================
// RAW PRINT
// ==========================================

app.post("/print", async (req, res) => {
  let temporaryDirectory = null;

  try {
    const {
      printerName,
      dataBase64,
    } = req.body || {};

    // --------------------------------------
    // Printer nomi
    // --------------------------------------

    if (
      typeof printerName !== "string" ||
      !printerName.trim()
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "printerName yuborilishi kerak.",
      });
    }

    // --------------------------------------
    // RAW data
    // --------------------------------------

    if (
      typeof dataBase64 !== "string" ||
      !dataBase64.trim()
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "dataBase64 yuborilishi kerak.",
      });
    }

    // --------------------------------------
    // Base64 -> Buffer
    // --------------------------------------

    let rawData;

    try {
      rawData = Buffer.from(
        dataBase64,
        "base64"
      );
    } catch {
      return res.status(400).json({
        ok: false,
        message:
          "dataBase64 noto‘g‘ri.",
      });
    }

    if (!rawData.length) {
      return res.status(400).json({
        ok: false,
        message:
          "Printerga yuboriladigan ma’lumot bo‘sh.",
      });
    }

    // --------------------------------------
    // Windows ekanini tekshirish
    // --------------------------------------

    if (process.platform !== "win32") {
      return res.status(400).json({
        ok: false,
        message:
          "RAW printer yuborish faqat Windows uchun sozlangan.",
      });
    }

    // --------------------------------------
    // Vaqtinchalik papka
    // --------------------------------------

    temporaryDirectory =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "marketbaza-print-"
        )
      );

    // --------------------------------------
    // RAW fayl
    // --------------------------------------

    const rawFilePath = path.join(
      temporaryDirectory,
      "receipt.bin"
    );

    await writeFile(
      rawFilePath,
      rawData
    );

    // --------------------------------------
    // PowerShell script
    // --------------------------------------

    const powershellScript =
      path.join(
        __dirname,
        "print-raw.ps1"
      );

    // --------------------------------------
    // Script mavjudligini tekshirish
    // --------------------------------------

    // PowerShellga fayl yo‘lini yuboramiz
    // --------------------------------------

    const {
      stdout,
      stderr,
    } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        powershellScript,
        "-PrinterName",
        printerName,
        "-FilePath",
        rawFilePath,
      ],
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    if (stderr?.trim()) {
      console.warn(
        "PowerShell:",
        stderr.trim()
      );
    }

    console.log(
      `[PRINT] ${printerName} -> ${rawData.length} bytes`
    );

    res.json({
      ok: true,
      message:
        "Chek printerga yuborildi.",
      printerName,
      bytes: rawData.length,
      output: stdout.trim(),
    });
  } catch (error) {
    console.error("");
    console.error("=================================");
    console.error(" PRINTERGA CHIQARISHDA XATO");
    console.error("=================================");
    console.error(error);
    console.error("");

    res.status(500).json({
      ok: false,
      message:
        error.stderr?.trim() ||
        error.message ||
        "Printerga chiqarishda xatolik yuz berdi.",
    });
  } finally {
    // --------------------------------------
    // Temporary papkani o‘chirish
    // --------------------------------------

    if (temporaryDirectory) {
      try {
        await rm(
          temporaryDirectory,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (cleanupError) {
        console.warn(
          "Temporary papkani o‘chirishda xato:",
          cleanupError.message
        );
      }
    }
  }
});

// ==========================================
// SERVER
// ==========================================

app.listen(
  PORT,
  "127.0.0.1",
  () => {
    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      "      MARKETBAZA PRINTER SERVICE"
    );
    console.log(
      "=========================================="
    );
    console.log(
      `Server: http://127.0.0.1:${PORT}`
    );
    console.log(
      `Health: http://127.0.0.1:${PORT}/health`
    );
    console.log(
      `Printers: http://127.0.0.1:${PORT}/printers`
    );
    console.log(
      "=========================================="
    );
    console.log(
      "Printer service ishga tushdi."
    );
    console.log("");
  }
);