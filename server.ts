import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY is not defined in the environment. AI evaluation will use elegant local templates.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const ai = getGeminiClient();

// API endpoint for automatic AI student evaluation
app.post('/api/evaluate', async (req, res) => {
  try {
    const { report } = req.body;
    if (!report) {
      return res.status(400).json({ success: false, message: 'Data laporan tidak ditemukan.' });
    }

    if (!ai) {
      // Return success with false flag, frontend will fallback gracefully
      return res.status(200).json({ 
        success: false, 
        message: 'Kunci API Gemini belum dikonfigurasi. Menggunakan template bawaan.' 
      });
    }

    // Build the prompt in Indonesian
    const completedPrayersList: string[] = [];
    let prayersCount = 0;

    Object.entries(report.shalat || {}).forEach(([name, val]: [string, any]) => {
      const isPerformed = typeof val === 'boolean' ? val : !!val?.performed;
      if (isPerformed) {
        prayersCount++;
        const timeStr = (typeof val === 'object' && val?.time) ? ` jam ${val.time}` : '';
        completedPrayersList.push(`${name.charAt(0).toUpperCase() + name.slice(1)}${timeStr}`);
      } else {
        const excuseStr = (typeof val === 'object' && val?.excuse) ? ` karena ${val.excuse}` : ' (tidak dikerjakan)';
        completedPrayersList.push(`${name.charAt(0).toUpperCase() + name.slice(1)} tidak${excuseStr}`);
      }
    });

    const completedPrayers = completedPrayersList.join(', ');
    const readingType = report.quran.type === 'quran' ? "Al-Qur'an" : "Iqro'";

    const prompt = `
Anda adalah seorang Ustadz / Guru Ngaji yang ramah, hangat, mendidik, dan sangat bijaksana di Indonesia.
Berikan feedback evaluasi rohani dan apresiasi yang memotivasi untuk Santri berdasarkan laporan harian mereka.

Nama Santri: ${report.santriName}
Aktivitas Shalat 5 Waktu: ${prayersCount} waktu dikerjakan (${completedPrayers || 'belum ada yang dilaporkan'}).
Ibadah Tambahan:
- Shalat Tahajud: ${report.tahajud ? 'Ya' : 'Tidak'}
- Shalat Witir: ${report.witir ? 'Ya' : 'Tidak'}
- Zikir Harian: ${report.zikir ? 'Ya' : 'Tidak'}

Membaca / Ngaji:
- Jenis: ${readingType}
- Materi/Surah: ${report.quran.surahOrJilid}
- Ayat/Halaman: ${report.quran.ayatOrHalaman}

Membantu Orang Tua: ${report.bantuOrangTua.checked ? `Ya, aktivitas: "${report.bantuOrangTua.description}"` : 'Tidak dilaporkan'}

Tulis tanggapan singkat (maksimal 3 kalimat) yang langsung ditujukan kepada santri (gunakan panggilan "Ananda [Nama Santri]" atau "Ananda"). 
Mulailah dengan pujian Islami yang tulus seperti "Masya Allah", "Barakallahu fiik", atau "Alhamdulillah".
Apresiasi shalatnya, beri semangat tentang mengaji/belajarnya, dan puji perbuatannya membantu orang tua jika ada. 
Gunakan nada suara yang penuh kasih sayang seorang guru ngaji yang ingin santrinya tumbuh sholeh/sholehah. 
PENTING: Jangan gunakan tanda bintang tebal (**) atau format markdown, melainkan teks biasa mengalir yang santun dan indah agar mudah disalin langsung.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const evaluationText = response.text?.trim() || '';

    return res.json({
      success: true,
      evaluation: evaluationText
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Gagal terhubung dengan layanan AI.' 
    });
  }
});

// Setup Vite Dev Server / Static Assets
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware integrated.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static assets.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Laporan Ngaji App running at http://localhost:${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
