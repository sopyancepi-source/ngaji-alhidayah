import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Users, Star, ClipboardCheck, Sparkles, 
  UserCheck, ShieldCheck, Moon, Heart, Award
} from 'lucide-react';
import { Santri, Report, Attendance } from './types';
import SantriForm from './components/SantriForm';
import GuruDashboard from './components/GuruDashboard';

// Mock Initial Santri Profiles
const INITIAL_SANTRI: Santri[] = [
  { id: 's1', name: 'Aisyah Zahra', class: 'Al-Qur\'an (Lancar)', streak: 8, avatar: '👧', pin: '1234', gender: 'P' },
  { id: 's2', name: 'Fatih Al-Fatih', class: 'Tahfidz', streak: 5, avatar: '👦', pin: '4321', gender: 'L' },
  { id: 's3', name: 'Rizky Ramadhan', class: 'Iqro 4', streak: 2, avatar: '👶', pin: '5678', gender: 'L' },
];

// Mock Initial Reports to populate the Dashboard immediately
const INITIAL_REPORTS: Report[] = [
  {
    id: 'r1',
    date: new Date().toISOString().split('T')[0],
    santriId: 's1',
    santriName: 'Aisyah Zahra',
    shalat: {
      subuh: { performed: true, time: '04:45' },
      dzuhur: { performed: true, time: '12:05' },
      ashar: { performed: true, time: '15:20' },
      maghrib: { performed: true, time: '18:10' },
      isya: { performed: true, time: '19:25' }
    },
    tahajud: true,
    witir: true,
    zikir: true,
    quran: { type: 'quran', surahOrJilid: 'Al-Mulk', ayatOrHalaman: '1-15' },
    bantuOrangTua: { checked: true, description: 'Menyuapi adik makan dan melipat pakaian.' },
    parentName: 'Ibu Fatimah',
    parentSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAYAAAA', // Simplified mock base64 signature
    status: 'verified',
    feedback: 'Masya Allah, Ananda Aisyah! Sangat luar biasa laporan ibadahmu hari ini. Shalat 5 waktu tertib, ditambah tahajud & wirid, dan sangat berbakti membantu Ibu melipat pakaian. Pertahankan prestasimu ya sayang!',
    parentFeedback: 'Alhamdulillah, terima kasih ulasan dan bimbingannya Ustadz. Aisyah jadi tambah semangat mengaji dan rajin shalat.',
    parentFeedbackSubmittedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
  },
  {
    id: 'r2',
    date: new Date().toISOString().split('T')[0],
    santriId: 's3',
    santriName: 'Rizky Ramadhan',
    shalat: {
      subuh: { performed: true, time: '04:50' },
      dzuhur: { performed: true, time: '12:15' },
      ashar: { performed: false, excuse: 'Tertidur lelap karena kelelahan setelah pulang sekolah' },
      maghrib: { performed: true, time: '18:05' },
      isya: { performed: true, time: '19:30' }
    },
    tahajud: false,
    witir: false,
    zikir: true,
    quran: { type: 'iqro', surahOrJilid: 'Jilid 4', ayatOrHalaman: 'Halaman 18' },
    bantuOrangTua: { checked: true, description: 'Merapikan mainan sendiri setelah bermain.' },
    parentName: 'Bapak Ahmad',
    parentSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAYAAAA',
    status: 'pending',
    feedback: '',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'r3',
    date: new Date().toISOString().split('T')[0],
    santriId: 's2',
    santriName: 'Fatih Al-Fatih',
    shalat: {
      subuh: { performed: true, time: '04:40' },
      dzuhur: { performed: true, time: '12:00' },
      ashar: { performed: true, time: '15:15' },
      maghrib: { performed: true, time: '18:00' },
      isya: { performed: true, time: '19:15' }
    },
    tahajud: true,
    witir: true,
    zikir: false,
    quran: { type: 'quran', surahOrJilid: 'An-Naba', ayatOrHalaman: '20-40' },
    bantuOrangTua: { checked: false, description: '' },
    parentName: 'Ibu Aminah',
    parentSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAYAAAA',
    status: 'pending',
    feedback: '',
    submittedAt: new Date(Date.now() - 3600000 * 0.5).toISOString(), // 30 mins ago
  }
];

export default function App() {
  const [role, setRole] = useState<'santri' | 'admin_l' | 'admin_p' | 'guru'>('santri');
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [activeSantriId, setActiveSantriId] = useState<string>('');

  // Hydrate states from LocalStorage on mount
  useEffect(() => {
    const localSantri = localStorage.getItem('laporan_santri_profiles');
    const localReports = localStorage.getItem('laporan_santri_reports');
    const localAttendance = localStorage.getItem('laporan_santri_attendance');

    if (localSantri) {
      setSantriList(JSON.parse(localSantri));
    } else {
      setSantriList(INITIAL_SANTRI);
      localStorage.setItem('laporan_santri_profiles', JSON.stringify(INITIAL_SANTRI));
    }

    if (localReports) {
      setReports(JSON.parse(localReports));
    } else {
      setReports(INITIAL_REPORTS);
      localStorage.setItem('laporan_santri_reports', JSON.stringify(INITIAL_REPORTS));
    }

    if (localAttendance) {
      setAttendance(JSON.parse(localAttendance));
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const initialAttendance: Attendance[] = [
        { id: 'att_s1', date: todayStr, santriId: 's1', status: 'hadir' },
        { id: 'att_s2', date: todayStr, santriId: 's2', status: 'hadir' },
        { id: 'att_s3', date: todayStr, santriId: 's3', status: 'sakit' }
      ];
      setAttendance(initialAttendance);
      localStorage.setItem('laporan_santri_attendance', JSON.stringify(initialAttendance));
    }
  }, []);

  // Set first student as default active
  useEffect(() => {
    if (santriList.length > 0 && !activeSantriId) {
      setActiveSantriId(santriList[0].id);
    }
  }, [santriList, activeSantriId]);

  // Save updates to LocalStorage helper
  const saveSantri = (updatedList: Santri[]) => {
    setSantriList(updatedList);
    localStorage.setItem('laporan_santri_profiles', JSON.stringify(updatedList));
  };

  const saveReports = (updatedList: Report[]) => {
    setReports(updatedList);
    localStorage.setItem('laporan_santri_reports', JSON.stringify(updatedList));
  };

  const saveAttendance = (updatedList: Attendance[]) => {
    setAttendance(updatedList);
    localStorage.setItem('laporan_santri_attendance', JSON.stringify(updatedList));
  };

  // Add new Student Profile
  const handleAddSantri = (name: string, className: string, pin: string, gender: 'L' | 'P' = 'L', phone?: string): Santri => {
    const emojis = gender === 'P' ? ['👧', '🧕'] : ['👦', '👳'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const newSantri: Santri = {
      id: 's_' + Date.now(),
      name,
      class: className,
      streak: 1,
      avatar: randomEmoji,
      pin: pin || '1234',
      gender,
      phone: phone || ''
    };

    const newList = [...santriList, newSantri];
    saveSantri(newList);
    return newSantri;
  };

  // Update existing Student Profile
  const handleUpdateSantri = (id: string, updatedFields: Partial<Santri>) => {
    const newList = santriList.map(s => s.id === id ? { ...s, ...updatedFields } : s);
    saveSantri(newList);
  };

  // Delete Student Profile
  const handleDeleteSantri = (id: string) => {
    const newList = santriList.filter(s => s.id !== id);
    saveSantri(newList);
    
    // Filter out reports for this student to keep database clean
    const newReports = reports.filter(r => r.santriId !== id);
    saveReports(newReports);

    // Clean draft storage
    localStorage.removeItem(`santri_draft_${id}`);

    // If activeSantriId was this student, reset to first in the list
    if (activeSantriId === id) {
      if (newList.length > 0) {
        setActiveSantriId(newList[0].id);
      } else {
        setActiveSantriId('');
      }
    }
  };

  // Submit Student Daily Report
  const handleSubmitReport = (newReportData: Omit<Report, 'id' | 'submittedAt'>) => {
    const reportId = 'r_' + Date.now();
    const newReport: Report = {
      ...newReportData,
      id: reportId,
      submittedAt: new Date().toISOString()
    };

    // Save report
    const updatedReports = [newReport, ...reports];
    saveReports(updatedReports);

    // Update streak for the student
    const updatedSantri = santriList.map(s => {
      if (s.id === newReport.santriId) {
        return { ...s, streak: s.streak + 1 };
      }
      return s;
    });
    saveSantri(updatedSantri);
  };

  // Verify and approve student report (Teacher action)
  const handleVerifyReport = (reportId: string, feedback: string, verifiedBy?: string) => {
    const updatedReports = reports.map(r => {
      if (r.id === reportId) {
        return { ...r, status: 'verified' as const, feedback, verifiedBy };
      }
      return r;
    });
    saveReports(updatedReports);
  };

  // Submit feedback/note from parents regarding the report (Parent action)
  const handleAddParentFeedback = (reportId: string, parentFeedback: string) => {
    const updatedReports = reports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          parentFeedback,
          parentFeedbackSubmittedAt: new Date().toISOString()
        };
      }
      return r;
    });
    saveReports(updatedReports);
  };

  // Force resets database to defaults
  const handleResetToDefaults = () => {
    if (confirm('Apakah Anda yakin ingin menyetel ulang semua data ke data bawaan?')) {
      saveSantri(INITIAL_SANTRI);
      saveReports(INITIAL_REPORTS);
      setActiveSantriId(INITIAL_SANTRI[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Dynamic Navigation Role Header Selector */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                Al-Hidayah Digital 
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100/50">
                  Guru & Santri
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Sistem Monitoring Ibadah & Ngaji Harian Otomatis</p>
            </div>
          </div>

          {/* Role Changer Toggle */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-1 justify-center">
              <button
                type="button"
                onClick={() => setRole('santri')}
                className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                  role === 'santri' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
                id="toggle-role-santri"
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Orang Tua
              </button>
              
              <button
                type="button"
                onClick={() => setRole('admin_l')}
                className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                  role === 'admin_l' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
                id="toggle-role-admin-l"
              >
                <UserCheck className="w-3.5 h-3.5" /> Admin (L)
              </button>

              <button
                type="button"
                onClick={() => setRole('admin_p')}
                className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                  role === 'admin_p' 
                    ? 'bg-fuchsia-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
                id="toggle-role-admin-p"
              >
                <Star className="w-3.5 h-3.5" /> Admin (P)
              </button>

              <button
                type="button"
                onClick={() => setRole('guru')}
                className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                  role === 'guru' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
                id="toggle-role-guru"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Guru Ngaji
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Informative Top Alert based on active role */}
      <div className="bg-emerald-50 border-b border-emerald-100/50 py-2.5 px-4 text-center text-[11px] font-medium text-emerald-800 flex items-center justify-center gap-1.5 flex-wrap">
        <span>💡</span>
        {role === 'santri' && (
          <span>
            <strong>Mode Orang Tua / Wali Santri:</strong> Silakan pilih profil putra/putri Anda, catat ibadah harian & bacaan mengaji, tanda tangani, lalu klik kirim!
          </span>
        )}
        {role === 'admin_l' && (
          <span>
            <strong>Mode Admin Laki-laki:</strong> Anda berwenang memverifikasi laporan & memberikan catatan motivasi khusus untuk <strong>Santri Laki-laki</strong>.
          </span>
        )}
        {role === 'admin_p' && (
          <span>
            <strong>Mode Admin Perempuan:</strong> Anda berwenang memverifikasi laporan & memberikan catatan motivasi khusus untuk <strong>Santri Perempuan</strong>.
          </span>
        )}
        {role === 'guru' && (
          <span>
            <strong>Mode Guru Ngaji (Pusat Komando):</strong> Akses penuh pendaftaran santri baru (L/P), sunting data, evaluasi, serta rekapitulasi progres seluruh santri.
          </span>
        )}
      </div>

      {/* Main Content View Frame */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {role === 'santri' ? (
            <motion.div
              key="view-santri"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <SantriForm 
                santriList={santriList}
                reports={reports}
                attendance={attendance}
                onSubmitReport={handleSubmitReport}
                onAddParentFeedback={handleAddParentFeedback}
                activeSantriId={activeSantriId}
                setActiveSantriId={setActiveSantriId}
              />
            </motion.div>
          ) : (
            <motion.div
              key="view-guru-or-admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <GuruDashboard 
                reports={reports}
                santriList={santriList}
                attendance={attendance}
                onSaveAttendance={saveAttendance}
                onVerifyReport={handleVerifyReport}
                onAddSantri={handleAddSantri}
                onUpdateSantri={handleUpdateSantri}
                onDeleteSantri={handleDeleteSantri}
                currentRole={role}
                onRefreshData={() => {
                  const local = localStorage.getItem('laporan_santri_reports');
                  if (local) setReports(JSON.parse(local));
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Informative Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-center text-slate-400 text-xs">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Al-Hidayah Digital. By Cepi Sopyan Dev.</p>
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline"
            id="btn-reset-data"
          >
            Reset Semua Data Simulasi
          </button>
        </div>
      </footer>
    </div>
  );
}
