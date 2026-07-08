export interface Santri {
  id: string;
  name: string;
  class: string; // e.g. "Iqro 3", "Juz Amma", "Al-Qur'an 30 Juz"
  streak: number; // Daily report streak
  avatar: string; // Avatar seed or emoji
  pin: string; // Password / PIN to login as Santri
  gender: 'L' | 'P'; // L = Laki-laki, P = Perempuan
  phone?: string; // WhatsApp / Phone number of parents
  weeklyRecap?: string; // Weekly behavior recap written by Admin/Ustadz at mosque
  weeklyRecapUpdatedAt?: string; // Timestamp of when the weekly recap was updated
  adminMosqueNote?: string; // Mosque learning note written by Admin
  adminMosqueNoteUpdatedAt?: string; // Timestamp of when Admin wrote/updated the note
  guruMosqueNote?: string; // Mosque learning note edited/corrected/added by Guru
  guruMosqueNoteUpdatedAt?: string; // Timestamp of when Guru wrote/updated the note
}

export interface Attendance {
  id: string;
  date: string; // YYYY-MM-DD
  santriId: string;
  status: 'hadir' | 'sakit' | 'izin' | 'alpa' | 'haid';
}

export interface PrayerDetail {
  performed: boolean;
  time?: string; // e.g. "04:45"
  photo?: string; // compressed base64 data URI
  excuse?: string; // reason if not praying
  isLiveCamera?: boolean; // true if taken directly via camera
  inputTimestamp?: string; // actual system time when recorded by parents
}

export interface ShalatStatus {
  subuh: PrayerDetail;
  dzuhur: PrayerDetail;
  ashar: PrayerDetail;
  maghrib: PrayerDetail;
  isya: PrayerDetail;
}

export interface QuranDetails {
  type: 'quran' | 'iqro';
  surahOrJilid: string; // e.g. "Al-Baqarah" or "Jilid 4"
  ayatOrHalaman: string; // e.g. "1-15" or "Halaman 20"
  photo?: string; // compressed base64 photo for reading activity
  isLiveCamera?: boolean;
}

export interface Report {
  id: string;
  date: string; // YYYY-MM-DD (typically start of week, or representative date)
  santriId: string;
  santriName: string;
  shalat: ShalatStatus;
  tahajud: boolean;
  tahajudTime?: string; // e.g. "03:30"
  tahajudPhoto?: string; // compressed base64 photo for tahajud
  tahajudIsLiveCamera?: boolean;
  quran: QuranDetails;
  zikir: boolean;
  witir: boolean;
  bantuOrangTua: {
    checked: boolean;
    description: string;
    photo?: string; // compressed base64 photo for devotion
    isLiveCamera?: boolean;
  };
  parentSignature: string; // Base64 PNG image string from canvas
  parentName: string;
  status: 'pending' | 'verified';
  feedback: string;
  parentFeedback?: string; // Optional feedback / short note from parents to Guru
  parentFeedbackSubmittedAt?: string; // Timestamp of when parent sent feedback
  verifiedBy?: string; // e.g. "Admin Laki-laki", "Admin Perempuan", "Guru Ngaji"
  submittedAt: string; // Timestamp ISO string
  
  // New weekly fields for precise reporting and diagrams
  isWeeklyReport?: boolean;
  weeklyShalatCounts?: {
    subuh: number;
    dzuhur: number;
    ashar: number;
    maghrib: number;
    isya: number;
  };
  weeklySunnahCounts?: {
    tahajud: number;
    witir: number;
    zikir: number;
  };
  startDate?: string;
  endDate?: string;
}
