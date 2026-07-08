import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Moon, BookOpen, Star, Sparkles, Heart, 
  User, ChevronRight, CheckCircle2, Award, ArrowLeft, Calendar, Camera, Video
} from 'lucide-react';
import { Santri, ShalatStatus, QuranDetails, Report, PrayerDetail } from '../types';
import SignaturePad from './SignaturePad';
import CameraCapture from './CameraCapture';

interface SantriFormProps {
  santriList: Santri[];
  onSubmitReport: (report: Omit<Report, 'id' | 'submittedAt'>) => void;
  activeSantriId: string;
  setActiveSantriId: (id: string) => void;
}

export default function SantriForm({ 
  santriList, 
  onSubmitReport,
  activeSantriId,
  setActiveSantriId
}: SantriFormProps) {
  // Navigation / Wizard step
  const [step, setStep] = useState<1 | 2>(1); // 1: Login PIN, 2: Laporan Harian

  // Login PIN States
  const [enteredPin, setEnteredPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Report Date State
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Helper for default prayer times
  const getDefaultPrayerTime = (prayer: string): string => {
    switch (prayer) {
      case 'subuh': return '04:45';
      case 'dzuhur': return '12:15';
      case 'ashar': return '15:30';
      case 'maghrib': return '18:05';
      case 'isya': return '19:20';
      default: return '12:00';
    }
  };

  // Helper to format the actual reporting date for each prayer time
  const getPrayerDayLabel = (prayerKey: keyof ShalatStatus): string => {
    if (!reportDate) return '';
    try {
      const dateObj = new Date(reportDate);
      if (prayerKey === 'maghrib' || prayerKey === 'isya') {
        dateObj.setDate(dateObj.getDate() - 1);
        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
        const dateNum = dateObj.getDate();
        const monthName = dateObj.toLocaleDateString('id-ID', { month: 'long' });
        return `${dayName}, ${dateNum} ${monthName} (Kemarin)`;
      } else {
        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
        const dateNum = dateObj.getDate();
        const monthName = dateObj.toLocaleDateString('id-ID', { month: 'long' });
        return `${dayName}, ${dateNum} ${monthName} (Hari Ini)`;
      }
    } catch (e) {
      return '';
    }
  };

  const checkTimeValidity = (key: string, enteredTime?: string): { isValid: boolean; range: string; msg: string } => {
    if (!enteredTime) return { isValid: true, range: '', msg: '' };
    
    const parts = enteredTime.split(':');
    if (parts.length < 2) return { isValid: true, range: '', msg: '' };
    
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    const totalMinutes = hour * 60 + minute;
    
    let start = 0;
    let end = 0;
    let rangeStr = '';
    let label = '';
    
    switch (key) {
      case 'subuh':
        start = 4 * 60; // 04:00
        end = 6 * 60; // 06:00
        rangeStr = '04:00 - 06:00';
        label = 'Subuh';
        break;
      case 'dzuhur':
        start = 11 * 60 + 45; // 11:45
        end = 15 * 60; // 15:00
        rangeStr = '11:45 - 15:00';
        label = 'Dzuhur';
        break;
      case 'ashar':
        start = 15 * 60; // 15:00
        end = 17 * 60 + 45; // 17:45
        rangeStr = '15:00 - 17:45';
        label = 'Ashar';
        break;
      case 'maghrib':
        start = 17 * 60 + 45; // 17:45
        end = 19 * 60; // 19:00
        rangeStr = '17:45 - 19:00';
        label = 'Maghrib';
        break;
      case 'isya':
        start = 19 * 60; // 19:00
        end = 24 * 60; // 24:00
        rangeStr = '19:00 - 23:59';
        label = 'Isya';
        break;
      default:
        return { isValid: true, range: '', msg: '' };
    }
    
    const isValid = totalMinutes >= start && totalMinutes <= end;
    return {
      isValid,
      range: rangeStr,
      msg: isValid 
        ? `Sesuai waktu (${rangeStr})`
        : `⚠️ Luar waktu wajar shalat ${label} (${rangeStr})`
    };
  };

  // Daily Report details
  const [shalat, setShalat] = useState<ShalatStatus>({
    subuh: { performed: false, time: '', photo: '', excuse: '' },
    dzuhur: { performed: false, time: '', photo: '', excuse: '' },
    ashar: { performed: false, time: '', photo: '', excuse: '' },
    maghrib: { performed: false, time: '', photo: '', excuse: '' },
    isya: { performed: false, time: '', photo: '', excuse: '' },
  });

  // Handler for setting deep prayer values
  const setPrayerDetailValue = (key: keyof ShalatStatus, field: keyof PrayerDetail, value: any) => {
    setShalat(prev => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      
      const current = prev[key] || { performed: false, time: '', photo: '', excuse: '' };
      const updated = {
        ...current,
        [field]: value
      };

      // Set inputTimestamp when performed is checked or whenever fields are modified while performed is true
      if (field === 'performed' && value === true) {
        updated.inputTimestamp = timeStr;
      } else if (updated.performed && !updated.inputTimestamp) {
        updated.inputTimestamp = timeStr;
      }

      return {
        ...prev,
        [key]: updated
      };
    });
  };

  // Utility to compress and resize photo to keep it lightweight (approx. 20KB-45KB)
  const compressAndSetPhoto = (key: keyof ShalatStatus, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // 60% quality jpeg
          setPrayerDetailValue(key, 'photo', compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [tahajud, setTahajud] = useState(false);
  const [tahajudTime, setTahajudTime] = useState('');
  const [tahajudPhoto, setTahajudPhoto] = useState('');
  const [tahajudIsLiveCamera, setTahajudIsLiveCamera] = useState(false);

  const [witir, setWitir] = useState(false);
  const [zikir, setZikir] = useState(false);
  
  const [quranType, setQuranType] = useState<'quran' | 'iqro'>('quran');
  const [quranSurah, setQuranSurah] = useState('');
  const [quranAyat, setQuranAyat] = useState('');
  const [quranPhoto, setQuranPhoto] = useState('');
  const [quranIsLiveCamera, setQuranIsLiveCamera] = useState(false);

  const [iqroJilid, setIqroJilid] = useState('1');
  const [iqroHalaman, setIqroHalaman] = useState('');

  const [bantuOrangTuaChecked, setBantuOrangTuaChecked] = useState(false);
  const [bantuOrangTuaDesc, setBantuOrangTuaDesc] = useState('');
  const [bantuOrangTuaPhoto, setBantuOrangTuaPhoto] = useState('');
  const [bantuOrangTuaIsLiveCamera, setBantuOrangTuaIsLiveCamera] = useState(false);
  
  const [parentName, setParentName] = useState('');
  const [parentSignature, setParentSignature] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);

  // Active Camera capture state
  const [activeCameraKey, setActiveCameraKey] = useState<keyof ShalatStatus | 'tahajud' | 'quran' | 'bantuOrangTua' | null>(null);

  // Utility to compress and resize non-prayer photos to keep them lightweight (approx 20KB-45KB)
  const compressPhotoAndSetField = (file: File, type: 'tahajud' | 'quran' | 'bantuOrangTua') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // 60% quality jpeg
          if (type === 'tahajud') {
            setTahajudPhoto(compressedBase64);
            setTahajudIsLiveCamera(false);
          } else if (type === 'quran') {
            setQuranPhoto(compressedBase64);
            setQuranIsLiveCamera(false);
          } else if (type === 'bantuOrangTua') {
            setBantuOrangTuaPhoto(compressedBase64);
            setBantuOrangTuaIsLiveCamera(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Status whether the previous draft has been restored for current activeSantriId
  const [isRestored, setIsRestored] = useState(false);

  // Load draft when activeSantriId changes
  useEffect(() => {
    if (!activeSantriId) {
      setIsRestored(false);
      return;
    }
    const stored = localStorage.getItem(`santri_draft_${activeSantriId}`);
    if (stored) {
      try {
        const draft = JSON.parse(stored);
        if (draft.reportDate) setReportDate(draft.reportDate);
        if (draft.shalat) setShalat(draft.shalat);
        if (draft.tahajud !== undefined) setTahajud(draft.tahajud);
        if (draft.tahajudTime !== undefined) setTahajudTime(draft.tahajudTime); else setTahajudTime('');
        if (draft.tahajudPhoto !== undefined) setTahajudPhoto(draft.tahajudPhoto); else setTahajudPhoto('');
        if (draft.tahajudIsLiveCamera !== undefined) setTahajudIsLiveCamera(draft.tahajudIsLiveCamera); else setTahajudIsLiveCamera(false);
        if (draft.witir !== undefined) setWitir(draft.witir);
        if (draft.zikir !== undefined) setZikir(draft.zikir);
        if (draft.quranType) setQuranType(draft.quranType);
        if (draft.quranSurah !== undefined) setQuranSurah(draft.quranSurah);
        if (draft.quranAyat !== undefined) setQuranAyat(draft.quranAyat);
        if (draft.quranPhoto !== undefined) setQuranPhoto(draft.quranPhoto); else setQuranPhoto('');
        if (draft.quranIsLiveCamera !== undefined) setQuranIsLiveCamera(draft.quranIsLiveCamera); else setQuranIsLiveCamera(false);
        if (draft.iqroJilid !== undefined) setIqroJilid(draft.iqroJilid);
        if (draft.iqroHalaman !== undefined) setIqroHalaman(draft.iqroHalaman);
        if (draft.bantuOrangTuaChecked !== undefined) setBantuOrangTuaChecked(draft.bantuOrangTuaChecked);
        if (draft.bantuOrangTuaDesc !== undefined) setBantuOrangTuaDesc(draft.bantuOrangTuaDesc);
        if (draft.bantuOrangTuaPhoto !== undefined) setBantuOrangTuaPhoto(draft.bantuOrangTuaPhoto); else setBantuOrangTuaPhoto('');
        if (draft.bantuOrangTuaIsLiveCamera !== undefined) setBantuOrangTuaIsLiveCamera(draft.bantuOrangTuaIsLiveCamera); else setBantuOrangTuaIsLiveCamera(false);
        if (draft.parentName !== undefined) setParentName(draft.parentName);
        if (draft.parentSignature !== undefined) setParentSignature(draft.parentSignature);
      } catch (e) {
        console.error('Failed to parse santri draft:', e);
      }
    } else {
      // Reset to defaults if no draft exists
      setReportDate(new Date().toISOString().split('T')[0]);
      setShalat({
        subuh: { performed: false, time: '', photo: '', excuse: '' },
        dzuhur: { performed: false, time: '', photo: '', excuse: '' },
        ashar: { performed: false, time: '', photo: '', excuse: '' },
        maghrib: { performed: false, time: '', photo: '', excuse: '' },
        isya: { performed: false, time: '', photo: '', excuse: '' },
      });
      setTahajud(false);
      setTahajudTime('');
      setTahajudPhoto('');
      setTahajudIsLiveCamera(false);
      setWitir(false);
      setZikir(false);
      setQuranType('quran');
      setQuranSurah('');
      setQuranAyat('');
      setQuranPhoto('');
      setQuranIsLiveCamera(false);
      setIqroJilid('1');
      setIqroHalaman('');
      setBantuOrangTuaChecked(false);
      setBantuOrangTuaDesc('');
      setBantuOrangTuaPhoto('');
      setBantuOrangTuaIsLiveCamera(false);
      setParentName('');
      setParentSignature('');
    }
    setIsRestored(true);
  }, [activeSantriId]);

  // Save draft whenever any draftable fields change, but only after restoring is done
  useEffect(() => {
    if (!activeSantriId || !isRestored) return;
    
    const draftData = {
      reportDate,
      shalat,
      tahajud,
      tahajudTime,
      tahajudPhoto,
      tahajudIsLiveCamera,
      witir,
      zikir,
      quranType,
      quranSurah,
      quranAyat,
      quranPhoto,
      quranIsLiveCamera,
      iqroJilid,
      iqroHalaman,
      bantuOrangTuaChecked,
      bantuOrangTuaDesc,
      bantuOrangTuaPhoto,
      bantuOrangTuaIsLiveCamera,
      parentName,
      parentSignature
    };
    localStorage.setItem(`santri_draft_${activeSantriId}`, JSON.stringify(draftData));
  }, [
    activeSantriId,
    isRestored,
    reportDate,
    shalat,
    tahajud,
    tahajudTime,
    tahajudPhoto,
    tahajudIsLiveCamera,
    witir,
    zikir,
    quranType,
    quranSurah,
    quranAyat,
    quranPhoto,
    quranIsLiveCamera,
    iqroJilid,
    iqroHalaman,
    bantuOrangTuaChecked,
    bantuOrangTuaDesc,
    bantuOrangTuaPhoto,
    bantuOrangTuaIsLiveCamera,
    parentName,
    parentSignature
  ]);

  // Handle Login PIN submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!enteredPin.trim()) return;

    const found = santriList.find(s => s.pin === enteredPin.trim());
    if (found) {
      setActiveSantriId(found.id);
      setStep(2);
      setEnteredPin('');
    } else {
      setLoginError('PIN salah atau tidak ditemukan. Silakan hubungi Ustadz/Ustadzah.');
    }
  };

  // Handler toggles
  const toggleShalat = (key: keyof ShalatStatus) => {
    const isCurrentlyPerformed = !!shalat[key]?.performed;
    const nextVal = !isCurrentlyPerformed;
    setPrayerDetailValue(key, 'performed', nextVal);
    
    if (nextVal) {
      // Pre-fill time with a smart default if empty
      if (!shalat[key]?.time) {
        setPrayerDetailValue(key, 'time', getDefaultPrayerTime(key));
      }
      // Clear excuse if performed
      setPrayerDetailValue(key, 'excuse', '');
    } else {
      // Clear time and photo if not performed
      setPrayerDetailValue(key, 'time', '');
      setPrayerDetailValue(key, 'photo', '');
    }
  };

  const selectedSantri = santriList.find(s => s.id === activeSantriId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSantriId || !selectedSantri) return;
    if (!parentSignature) {
      alert('Mohon minta Orang Tua / Wali untuk menandatangani laporan terlebih dahulu.');
      return;
    }

    const quranDetails: QuranDetails = quranType === 'quran'
      ? { type: 'quran', surahOrJilid: quranSurah || 'Al-Fatihah', ayatOrHalaman: quranAyat || '1', photo: quranPhoto || undefined, isLiveCamera: quranIsLiveCamera || undefined }
      : { type: 'iqro', surahOrJilid: `Jilid ${iqroJilid}`, ayatOrHalaman: `Halaman ${iqroHalaman || '1'}`, photo: quranPhoto || undefined, isLiveCamera: quranIsLiveCamera || undefined };

    onSubmitReport({
      date: reportDate,
      santriId: activeSantriId,
      santriName: selectedSantri.name,
      shalat,
      tahajud,
      tahajudTime: tahajud ? (tahajudTime || undefined) : undefined,
      tahajudPhoto: tahajud ? (tahajudPhoto || undefined) : undefined,
      tahajudIsLiveCamera: tahajud ? (tahajudIsLiveCamera || undefined) : undefined,
      quran: quranDetails,
      zikir,
      witir,
      bantuOrangTua: {
        checked: bantuOrangTuaChecked,
        description: bantuOrangTuaDesc,
        photo: bantuOrangTuaChecked ? (bantuOrangTuaPhoto || undefined) : undefined,
        isLiveCamera: bantuOrangTuaChecked ? (bantuOrangTuaIsLiveCamera || undefined) : undefined
      },
      parentSignature,
      parentName: parentName || 'Orang Tua',
      status: 'pending',
      feedback: ''
    });

    // Clear saved draft on successful submission
    localStorage.removeItem(`santri_draft_${activeSantriId}`);

    setIsSuccess(true);
    setTimeout(() => {
      // Reset form states
      setIsSuccess(false);
      setStep(1);
      setReportDate(new Date().toISOString().split('T')[0]);
      setShalat({
        subuh: { performed: false, time: '', photo: '', excuse: '' },
        dzuhur: { performed: false, time: '', photo: '', excuse: '' },
        ashar: { performed: false, time: '', photo: '', excuse: '' },
        maghrib: { performed: false, time: '', photo: '', excuse: '' },
        isya: { performed: false, time: '', photo: '', excuse: '' },
      });
      setTahajud(false);
      setTahajudTime('');
      setTahajudPhoto('');
      setTahajudIsLiveCamera(false);
      setWitir(false);
      setZikir(false);
      setQuranSurah('');
      setQuranAyat('');
      setQuranPhoto('');
      setQuranIsLiveCamera(false);
      setIqroHalaman('');
      setBantuOrangTuaChecked(false);
      setBantuOrangTuaDesc('');
      setBantuOrangTuaPhoto('');
      setBantuOrangTuaIsLiveCamera(false);
      setParentName('');
      setParentSignature('');
    }, 3000);
  };

  const selectedClassOptions = [
    'Iqro 1', 'Iqro 2', 'Iqro 3', 'Iqro 4', 'Iqro 5', 'Iqro 6',
    'Juz Amma', 'Al-Qur\'an (Lancar)', 'Tahfidz'
  ];

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 min-h-[600px] flex flex-col">
      {/* Visual Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-5 -mt-5" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full -ml-8 -mb-8" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <span className="text-xs bg-emerald-500/30 text-emerald-100 px-3 py-1 rounded-full font-medium tracking-wide">
              Laporan Santri Harian
            </span>
            <h1 className="text-2xl font-bold tracking-tight mt-1.5 font-sans">
              Buku Penghubung Digital
            </h1>
            <p className="text-emerald-100/80 text-xs mt-1">
              Catat ibadah harianmu untuk divalidasi oleh Ustadz & Orang Tua
            </p>
          </div>
          <Award className="w-10 h-10 text-amber-300 animate-pulse" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center py-10"
              id="success-message"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5 text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Alhamdulillah!</h2>
              <p className="text-slate-600 text-sm mt-2 max-w-xs mx-auto">
                Laporan harianmu telah berhasil disimpan dan dikirimkan ke Guru Ngaji. Tetap istiqomah ya!
              </p>
              <div className="mt-6 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Mendapatkan +10 poin kebaikan!
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col justify-center py-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-sm">
                  <span className="text-2xl">🔑</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800">Masuk Akun Santri</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  Silakan masukkan PIN / Sandi 4-digit Anda yang telah didaftarkan oleh Ustadz/Ustadzah.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="••••"
                    value={enteredPin}
                    onChange={(e) => {
                      setLoginError('');
                      setEnteredPin(e.target.value.replace(/\D/g, ''));
                    }}
                    className="w-full text-center text-2xl font-bold tracking-[0.75em] pl-[0.75em] py-4 border-2 border-slate-200 bg-slate-50/50 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-mono"
                    id="input-santri-login-pin"
                    autoFocus
                  />
                  {loginError && (
                    <p className="text-[11px] text-red-500 font-bold text-center mt-2" id="login-error-msg">
                      ⚠️ {loginError}
                    </p>
                  )}
                </div>

                {/* Virtual Numeric Keyboard for Touch Screen Ease */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setLoginError('');
                        if (enteredPin.length < 6) {
                          setEnteredPin(prev => prev + num);
                        }
                      }}
                      className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-extrabold text-slate-700 transition-all border border-slate-200/40 active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEnteredPin('')}
                    className="py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-extrabold transition-all border border-red-100 active:scale-95"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError('');
                      if (enteredPin.length < 6) {
                        setEnteredPin(prev => prev + '0');
                      }
                    }}
                    className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-extrabold text-slate-700 transition-all border border-slate-200/40 active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="submit"
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-sm active:scale-95"
                  >
                    Masuk
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Lupa PIN? Silakan tanyakan kepada Ustadz/Ustadzah.
                  </p>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col space-y-5"
            >
              {/* Back button and title */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Santri:</p>
                  <p className="text-xs font-bold text-emerald-800">{selectedSantri?.name}</p>
                </div>
              </div>

              <div className="space-y-5 flex-1 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
                {/* 0. Pilih Tanggal Laporan */}
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-3 -mt-3" />
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Tanggal Laporan
                  </label>
                  <input
                    type="date"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full text-xs p-3 border border-emerald-200 bg-white rounded-xl focus:outline-emerald-500 font-extrabold text-slate-700 tracking-wider"
                    id="report-date-picker"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    *Pilihlah tanggal laporan berjalan. Demi kenyamanan Anda, shalat <strong>Subuh, Dzuhur, & Ashar</strong> dicatat untuk hari ini, sedangkan shalat <strong>Maghrib & Isya</strong> otomatis mengambil catatan kemarin (saat anak sedang mengaji di masjid).
                  </p>
                </div>

                {/* 1. Shalat 5 Waktu */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-500" /> 1. Laporan Shalat 5 Waktu
                  </h3>
                  
                  <div className="space-y-3.5">
                    {(Object.keys(shalat) as Array<keyof ShalatStatus>).map((key) => {
                      const label = key.charAt(0).toUpperCase() + key.slice(1);
                      const detail = shalat[key];
                      const isPerformed = !!detail?.performed;
                      
                      // Emojis for prayer
                      const getIcon = () => {
                        switch(key) {
                          case 'subuh': return '🌅';
                          case 'dzuhur': return '☀️';
                          case 'ashar': return '🌤️';
                          case 'maghrib': return '🌇';
                          case 'isya': return '🌙';
                          default: return '🕌';
                        }
                      };

                      return (
                        <div 
                          key={key} 
                          className="bg-slate-50/50 border border-slate-200/40 rounded-2xl p-3.5 transition-all hover:border-slate-200"
                        >
                          {/* Prayer Header & Toggle */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl bg-slate-100 p-1.5 rounded-xl block">{getIcon()}</span>
                              <div>
                                <span className="font-extrabold text-slate-800 text-sm tracking-wide block">{label}</span>
                                <span className={`text-[9px] font-bold block leading-tight ${key === 'maghrib' || key === 'isya' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {getPrayerDayLabel(key)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Two Pill options: Shalat / Tidak */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/20">
                              <button
                                type="button"
                                onClick={() => {
                                  setPrayerDetailValue(key, 'performed', true);
                                  if (!detail?.time) {
                                    setPrayerDetailValue(key, 'time', getDefaultPrayerTime(key));
                                  }
                                  setPrayerDetailValue(key, 'excuse', '');
                                }}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  isPerformed 
                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Shalat
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPrayerDetailValue(key, 'performed', false);
                                  setPrayerDetailValue(key, 'time', '');
                                  setPrayerDetailValue(key, 'photo', '');
                                }}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  !isPerformed 
                                    ? 'bg-red-500 text-white shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Tidak
                              </button>
                            </div>
                          </div>

                          {/* Conditional Inputs */}
                          <AnimatePresence mode="wait">
                            {isPerformed ? (
                              <motion.div
                                key="performed-fields"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3.5 pt-1 overflow-hidden"
                              >
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Jam Shalat */}
                                  <div>
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                      Jam Shalat
                                    </label>
                                    <input
                                      type="time"
                                      required={isPerformed}
                                      value={detail?.time || ''}
                                      onChange={(e) => setPrayerDetailValue(key, 'time', e.target.value)}
                                      className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500 text-slate-700 font-bold font-mono"
                                    />
                                    {(() => {
                                      const analysis = checkTimeValidity(key, detail?.time);
                                      if (!detail?.time) return null;
                                      return (
                                        <p className={`text-[9px] mt-1 font-extrabold ${
                                          analysis.isValid ? 'text-emerald-600' : 'text-amber-600 animate-pulse'
                                        }`}>
                                          {analysis.msg}
                                        </p>
                                      );
                                    })()}
                                  </div>

                                  {/* Foto Pelaksanaan Button */}
                                  <div>
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                      Foto Pelaksanaan
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => setActiveCameraKey(key)}
                                      className="w-full flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white rounded-xl cursor-pointer text-[10px] font-bold text-slate-600 hover:text-emerald-700 transition-all text-center h-[34px] overflow-hidden"
                                    >
                                      {detail?.photo ? '✅ Ganti Foto' : '📷 Ambil Foto'}
                                    </button>
                                  </div>
                                </div>

                                {/* Photo Preview */}
                                {detail?.photo && (
                                  <div className="relative bg-slate-100 rounded-xl p-2 flex items-center justify-between gap-2 border border-slate-200/50">
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={detail.photo} 
                                        alt="Pelaksanaan Shalat" 
                                        className="w-10 h-10 object-cover rounded-lg border border-white shadow-xs"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-700">Foto Siap!</p>
                                        <p className="text-[9px] text-slate-400">Ukuran diperkecil otomatis</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setPrayerDetailValue(key, 'photo', '')}
                                      className="text-[9px] text-red-500 hover:underline font-bold"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            ) : (
                              <motion.div
                                key="excuse-fields"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-1 overflow-hidden"
                              >
                                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                  Alasan Tidak Shalat <span className="text-red-500">*</span>
                                </label>
                                {(() => {
                                  const standardOptions = ["Sakit", "Haid (Udzur Syar'i)", "Tertidur (Lupa)", "Sedang dalam perjalanan (Musafir)"];
                                  const isCustomExcuse = !!detail?.excuse && !standardOptions.includes(detail.excuse);
                                  const selectValue = isCustomExcuse ? "Lainnya" : (detail?.excuse || "");
                                  
                                  return (
                                    <>
                                      <select
                                        required={!isPerformed}
                                        value={selectValue}
                                        onChange={(e) => setPrayerDetailValue(key, 'excuse', e.target.value)}
                                        className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500 text-slate-700 font-bold"
                                      >
                                        <option value="">-- Pilih Alasan --</option>
                                        <option value="Sakit">Sakit</option>
                                        <option value="Haid (Udzur Syar'i)">Haid (Udzur Syar'i)</option>
                                        <option value="Tertidur (Lupa)">Tertidur / Lupa</option>
                                        <option value="Sedang dalam perjalanan (Musafir)">Sedang dalam perjalanan (Musafir)</option>
                                        <option value="Lainnya">Lainnya...</option>
                                      </select>
                                      
                                      {isCustomExcuse && (
                                        <input
                                          type="text"
                                          placeholder="Tuliskan alasan lainnya di sini..."
                                          required
                                          value={detail?.excuse === 'Lainnya' ? '' : (detail?.excuse || '')}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setPrayerDetailValue(key, 'excuse', val === '' ? 'Lainnya' : val);
                                          }}
                                          className="w-full text-xs p-2.5 mt-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500 text-slate-700 font-medium"
                                        />
                                      )}
                                    </>
                                  );
                                })()}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Ibadah Sunnah & Zikir */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-indigo-500" /> 2. Sunnah & Zikir
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTahajud(!tahajud)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        tahajud 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-bold' 
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                      id="checkbox-tahajud"
                    >
                      <span className="text-lg">🌌</span>
                      <span className="text-[10px] mt-1">Tahajud</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setWitir(!witir)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        witir 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-bold' 
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                      id="checkbox-witir"
                    >
                      <span className="text-lg">✨</span>
                      <span className="text-[10px] mt-1">Witir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setZikir(!zikir)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        zikir 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-bold' 
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                      id="checkbox-zikir"
                    >
                      <span className="text-lg">📿</span>
                      <span className="text-[10px] mt-1">Zikir</span>
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {tahajud && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {/* Jam Tahajud */}
                          <div>
                            <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                              Jam Shalat Tahajud <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="time"
                              required={tahajud}
                              value={tahajudTime}
                              onChange={(e) => setTahajudTime(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-indigo-500 text-slate-700 font-bold font-mono"
                            />
                          </div>

                          {/* Foto Tahajud */}
                          <div>
                            <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                              Foto Bukti Tahajud
                            </label>
                            <button
                              type="button"
                              onClick={() => setActiveCameraKey('tahajud')}
                              className="w-full flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 bg-white rounded-xl cursor-pointer text-[10px] font-bold text-slate-600 hover:text-indigo-700 transition-all text-center h-[34px] overflow-hidden"
                            >
                              {tahajudPhoto ? '✅ Ganti Foto' : '📷 Ambil Foto'}
                            </button>
                          </div>
                        </div>

                        {/* Tahajud Photo Preview */}
                        {tahajudPhoto && (
                          <div className="relative bg-white rounded-xl p-2 flex items-center justify-between gap-2 border border-slate-200/50">
                            <div className="flex items-center gap-2">
                              <img 
                                src={tahajudPhoto} 
                                alt="Bukti Shalat Tahajud" 
                                className="w-10 h-10 object-cover rounded-lg border border-slate-100 shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="text-[10px] font-bold text-slate-700 font-sans">Foto Tahajud Siap!</p>
                                <p className="text-[9px] text-slate-400">Ukuran diperkecil otomatis</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTahajudPhoto('')}
                              className="text-[9px] text-red-500 hover:underline font-bold"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Bacaan Qur'an / Iqro' */}
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" /> 3. Kegiatan Membaca (Ngaji)
                  </h3>
                  
                  {/* Selector Type */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setQuranType('quran')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        quranType === 'quran'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                      id="quran-type-quran"
                    >
                      Al-Qur'an
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuranType('iqro')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        quranType === 'iqro'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                      id="quran-type-iqro"
                    >
                      Iqro'
                    </button>
                  </div>

                  {quranType === 'quran' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Surah</label>
                        <input
                          type="text"
                          required={quranType === 'quran'}
                          value={quranSurah}
                          onChange={(e) => setQuranSurah(e.target.value)}
                          placeholder="Contoh: Al-Mulk"
                          className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500"
                          id="input-quran-surah"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Ayat</label>
                        <input
                          type="text"
                          required={quranType === 'quran'}
                          value={quranAyat}
                          onChange={(e) => setQuranAyat(e.target.value)}
                          placeholder="Contoh: 1-10"
                          className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500"
                          id="input-quran-ayat"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Jilid</label>
                        <select
                          value={iqroJilid}
                          onChange={(e) => setIqroJilid(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500"
                          id="select-iqro-jilid"
                        >
                          {['1', '2', '3', '4', '5', '6'].map((n) => (
                            <option key={n} value={n}>Jilid {n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Halaman</label>
                        <input
                          type="text"
                          required={quranType === 'iqro'}
                          value={iqroHalaman}
                          onChange={(e) => setIqroHalaman(e.target.value)}
                          placeholder="Contoh: Halaman 12"
                          className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500"
                          id="input-iqro-halaman"
                        />
                      </div>
                    </div>
                  )}

                  {/* Foto Membaca */}
                  <div className="mt-3 pt-3 border-t border-slate-200/40 grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                        Foto Bukti Ngaji <span className="text-slate-400">(Optional)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveCameraKey('quran')}
                          className="flex-1 flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white rounded-xl cursor-pointer text-[10px] font-bold text-slate-600 hover:text-emerald-700 transition-all text-center h-[34px] overflow-hidden"
                        >
                          {quranPhoto ? '✅ Ganti Foto Bukti' : '📷 Ambil Foto Ngaji'}
                        </button>
                        {quranPhoto && (
                          <button
                            type="button"
                            onClick={() => setQuranPhoto('')}
                            className="px-3 text-[10px] text-red-500 hover:underline font-bold h-[34px] bg-white border border-red-200 rounded-xl hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>

                    {quranPhoto && (
                      <div className="relative bg-white rounded-xl p-2 flex items-center justify-between gap-2 border border-slate-200/50 mt-1">
                        <div className="flex items-center gap-2">
                          <img 
                            src={quranPhoto} 
                            alt="Bukti Membaca" 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-100 shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 font-sans">Foto Bukti Ngaji Siap!</p>
                            <p className="text-[9px] text-slate-400">Ukuran diperkecil otomatis</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Berbakti / Bantu Orang Tua */}
                <div className="border border-pink-100 bg-pink-50/20 p-4 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-pink-500" /> 4. Berbakti Ke Orang Tua
                    </h3>
                    <input
                      type="checkbox"
                      id="bantu-ortu-check"
                      checked={bantuOrangTuaChecked}
                      onChange={(e) => setBantuOrangTuaChecked(e.target.checked)}
                      className="w-4.5 h-4.5 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                    />
                  </div>
                  
                  {bantuOrangTuaChecked && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2.5 space-y-3"
                    >
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Apa kebaikan yang dilakukan hari ini?
                        </label>
                        <textarea
                          required={bantuOrangTuaChecked}
                          value={bantuOrangTuaDesc}
                          onChange={(e) => setBantuOrangTuaDesc(e.target.value)}
                          placeholder="Contoh: Merapikan tempat tidur sendiri dan menyapu teras rumah."
                          className="w-full text-xs p-2.5 border border-pink-200 bg-white rounded-xl focus:outline-pink-400 min-h-[50px] resize-none font-medium text-slate-700"
                          id="input-bantu-ortu-desc"
                        />
                      </div>

                      {/* Foto Berbakti */}
                      <div className="pt-2 border-t border-pink-100 grid grid-cols-1 gap-2">
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-pink-700 mb-1">
                            Foto Bukti Kegiatan Kebaikan <span className="text-slate-400">(Optional)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveCameraKey('bantuOrangTua')}
                              className="flex-1 flex items-center justify-center gap-1.5 p-2 border border-dashed border-pink-300 hover:border-pink-500 hover:bg-pink-50/20 bg-white rounded-xl cursor-pointer text-[10px] font-bold text-slate-600 hover:text-pink-700 transition-all text-center h-[34px] overflow-hidden"
                            >
                              {bantuOrangTuaPhoto ? '✅ Ganti Foto' : '📷 Ambil Foto Kegiatan'}
                            </button>
                            {bantuOrangTuaPhoto && (
                              <button
                                type="button"
                                onClick={() => setBantuOrangTuaPhoto('')}
                                className="px-3 text-[10px] text-red-500 hover:underline font-bold h-[34px] bg-white border border-red-200 rounded-xl hover:bg-red-50"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>

                        {bantuOrangTuaPhoto && (
                          <div className="relative bg-white rounded-xl p-2 flex items-center justify-between gap-2 border border-pink-200/50 mt-1">
                            <div className="flex items-center gap-2">
                              <img 
                                src={bantuOrangTuaPhoto} 
                                alt="Bukti Kebaikan" 
                                className="w-10 h-10 object-cover rounded-lg border border-slate-100 shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="text-[10px] font-bold text-slate-700 font-sans">Foto Kegiatan Siap!</p>
                                <p className="text-[9px] text-slate-400">Ukuran diperkecil otomatis</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 5. Tanda Tangan Orang Tua */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> 5. Verifikasi Orang Tua / Wali
                  </h3>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Orang Tua / Wali</label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Contoh: Bapak Ahmad / Ibu Fatimah"
                      className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500"
                      id="input-parent-name"
                    />
                  </div>

                  <SignaturePad 
                    value={parentSignature}
                    onChange={setParentSignature}
                  />
                </div>
              </div>

              {/* Submit Section */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  id="btn-submit-report"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" /> Kirim Laporan Harian
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Active camera capture overlays */}
      <AnimatePresence>
        {activeCameraKey && (
          <CameraCapture
            title={
              activeCameraKey === 'tahajud' 
                ? 'Tahajud' 
                : activeCameraKey === 'quran' 
                ? 'Ngaji (Membaca Qur\'an / Iqro\')' 
                : activeCameraKey === 'bantuOrangTua' 
                ? 'Berbakti Ke Orang Tua' 
                : activeCameraKey.charAt(0).toUpperCase() + activeCameraKey.slice(1)
            }
            onCapture={(base64) => {
              if (activeCameraKey === 'tahajud') {
                setTahajudPhoto(base64);
                setTahajudIsLiveCamera(true);
              } else if (activeCameraKey === 'quran') {
                setQuranPhoto(base64);
                setQuranIsLiveCamera(true);
              } else if (activeCameraKey === 'bantuOrangTua') {
                setBantuOrangTuaPhoto(base64);
                setBantuOrangTuaIsLiveCamera(true);
              } else {
                setPrayerDetailValue(activeCameraKey, 'photo', base64);
                setPrayerDetailValue(activeCameraKey, 'isLiveCamera', true);
              }
            }}
            onClose={() => setActiveCameraKey(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
