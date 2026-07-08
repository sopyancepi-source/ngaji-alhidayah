import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Moon, BookOpen, Star, Sparkles, Heart, 
  User, ChevronRight, CheckCircle2, Award, ArrowLeft, Calendar, Camera, Video,
  PenLine, History, MessageSquare, Check, MessageCircle, Send, Printer, Share2
} from 'lucide-react';
import { Santri, ShalatStatus, QuranDetails, Report, PrayerDetail, Attendance } from '../types';
import SignaturePad from './SignaturePad';
import CameraCapture from './CameraCapture';

interface SantriFormProps {
  santriList: Santri[];
  reports: Report[];
  attendance: Attendance[];
  onSubmitReport: (report: Omit<Report, 'id' | 'submittedAt'>) => void;
  onAddParentFeedback: (reportId: string, parentFeedback: string) => void;
  activeSantriId: string;
  setActiveSantriId: (id: string) => void;
}

export default function SantriForm({ 
  santriList, 
  reports,
  attendance,
  onSubmitReport,
  onAddParentFeedback,
  activeSantriId,
  setActiveSantriId
}: SantriFormProps) {
  // Navigation / Wizard step
  const [step, setStep] = useState<1 | 2>(1); // 1: Login PIN, 2: Laporan Harian
  const [subTab, setSubTab] = useState<'harian' | 'mingguan' | 'raport'>('harian');
  const [parentFeedbackText, setParentFeedbackText] = useState<{ [reportId: string]: string }>({});

  // Login PIN States
  const [enteredPin, setEnteredPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Report Date State
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [raportDate, setRaportDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Helper for formatting date to Indonesian long date format
  const formatIDDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to handle print functionality
  const handlePrintRaport = () => {
    window.print();
  };

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
  
  const [weeklyShalatCounts, setWeeklyShalatCounts] = useState({
    subuh: 7,
    dzuhur: 7,
    ashar: 7,
    maghrib: 7,
    isya: 7
  });

  const [weeklySunnahCounts, setWeeklySunnahCounts] = useState({
    tahajud: 3,
    witir: 3,
    zikir: 5
  });
  
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
        
        if (draft.weeklyShalatCounts !== undefined) {
          setWeeklyShalatCounts(draft.weeklyShalatCounts);
        } else {
          setWeeklyShalatCounts({ subuh: 7, dzuhur: 7, ashar: 7, maghrib: 7, isya: 7 });
        }
        if (draft.weeklySunnahCounts !== undefined) {
          setWeeklySunnahCounts(draft.weeklySunnahCounts);
        } else {
          setWeeklySunnahCounts({ tahajud: 3, witir: 3, zikir: 5 });
        }

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
      setWeeklyShalatCounts({ subuh: 7, dzuhur: 7, ashar: 7, maghrib: 7, isya: 7 });
      setWeeklySunnahCounts({ tahajud: 3, witir: 3, zikir: 5 });
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
      weeklyShalatCounts,
      weeklySunnahCounts,
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
    weeklyShalatCounts,
    weeklySunnahCounts,
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
      setSubTab('harian');
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

    if (subTab === 'harian') {
      // Daily Report submission
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
        feedback: '',
        isWeeklyReport: false
      });
    } else {
      // Weekly Report submission
      // Format start and end date for the week of the selected reportDate
      const selectedDateObj = new Date(reportDate);
      const dayOfWeek = selectedDateObj.getDay(); // 0 is Sunday, 1 is Monday, etc.
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // adjust when day is Sunday
      
      const mondayDate = new Date(selectedDateObj);
      mondayDate.setDate(selectedDateObj.getDate() + diffToMonday);
      
      const sundayDate = new Date(mondayDate);
      sundayDate.setDate(mondayDate.getDate() + 6);
      
      const startDateStr = mondayDate.toISOString().split('T')[0];
      const endDateStr = sundayDate.toISOString().split('T')[0];

      // Build compatible shalat status
      const compatibleShalat: ShalatStatus = {
        subuh: { performed: weeklyShalatCounts.subuh > 0, time: `${weeklyShalatCounts.subuh} Hari`, photo: '', excuse: weeklyShalatCounts.subuh === 0 ? 'Tidak terlaksana' : '' },
        dzuhur: { performed: weeklyShalatCounts.dzuhur > 0, time: `${weeklyShalatCounts.dzuhur} Hari`, photo: '', excuse: weeklyShalatCounts.dzuhur === 0 ? 'Tidak terlaksana' : '' },
        ashar: { performed: weeklyShalatCounts.ashar > 0, time: `${weeklyShalatCounts.ashar} Hari`, photo: '', excuse: weeklyShalatCounts.ashar === 0 ? 'Tidak terlaksana' : '' },
        maghrib: { performed: weeklyShalatCounts.maghrib > 0, time: `${weeklyShalatCounts.maghrib} Hari`, photo: '', excuse: weeklyShalatCounts.maghrib === 0 ? 'Tidak terlaksana' : '' },
        isya: { performed: weeklyShalatCounts.isya > 0, time: `${weeklyShalatCounts.isya} Hari`, photo: '', excuse: weeklyShalatCounts.isya === 0 ? 'Tidak terlaksana' : '' }
      };

      onSubmitReport({
        date: reportDate,
        santriId: activeSantriId,
        santriName: selectedSantri.name,
        shalat: compatibleShalat,
        tahajud: weeklySunnahCounts.tahajud > 0,
        tahajudTime: weeklySunnahCounts.tahajud > 0 ? `${weeklySunnahCounts.tahajud} Hari` : undefined,
        tahajudPhoto: undefined,
        tahajudIsLiveCamera: undefined,
        quran: quranDetails,
        zikir: weeklySunnahCounts.zikir > 0,
        witir: weeklySunnahCounts.witir > 0,
        bantuOrangTua: {
          checked: bantuOrangTuaChecked,
          description: bantuOrangTuaDesc,
          photo: bantuOrangTuaChecked ? (bantuOrangTuaPhoto || undefined) : undefined,
          isLiveCamera: bantuOrangTuaChecked ? (bantuOrangTuaIsLiveCamera || undefined) : undefined
        },
        parentSignature,
        parentName: parentName || 'Orang Tua',
        status: 'pending',
        feedback: '',
        isWeeklyReport: true,
        weeklyShalatCounts,
        weeklySunnahCounts,
        startDate: startDateStr,
        endDate: endDateStr
      });
    }

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
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col space-y-4 text-left"
            >
              {/* Back button and title */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSubTab('harian');
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Santri:</p>
                  <p className="text-xs font-bold text-emerald-800">{selectedSantri?.name}</p>
                </div>
              </div>

              {/* Sub-Tabs selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setSubTab('harian')}
                  className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
                    subTab === 'harian'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 bg-white/40'
                  }`}
                  id="subtab-lapor-harian"
                >
                  <PenLine className="w-3.5 h-3.5" /> Lapor Harian
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('raport')}
                  className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
                    subTab === 'raport'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 bg-white/40'
                  }`}
                  id="subtab-raport-mingguan"
                >
                  <Calendar className="w-3.5 h-3.5" /> Laporan Mingguan
                </button>
              </div>

              {subTab === 'harian' ? (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-5">
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
                        id="report-date-picker-daily"
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
                                      const isFemale = selectedSantri?.gender === 'P';
                                      const standardOptions = isFemale 
                                        ? ["Sakit", "Haid (Udzur Syar'i)", "Tertidur (Lupa)", "Sedang dalam perjalanan (Musafir)"]
                                        : ["Sakit", "Tertidur (Lupa)", "Sedang dalam perjalanan (Musafir)"];
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
                                            {isFemale && (
                                              <option value="Haid (Udzur Syar'i)">Haid (Udzur Syar'i)</option>
                                            )}
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
                          id="checkbox-tahajud-daily"
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
                          id="checkbox-witir-daily"
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
                          id="checkbox-zikir-daily"
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
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setQuranType('quran')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            quranType === 'quran'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-500 border-slate-200'
                          }`}
                          id="quran-type-quran-daily"
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
                          id="quran-type-iqro-daily"
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
                              id="input-quran-surah-daily"
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
                              id="input-quran-ayat-daily"
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
                              id="select-iqro-jilid-daily"
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
                              id="input-iqro-halaman-daily"
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
                          id="bantu-ortu-check-daily"
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
                              id="input-bantu-ortu-desc-daily"
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
                          id="input-parent-name-daily"
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
                      onClick={() => {
                        setStep(1);
                        setSubTab('harian');
                      }}
                      className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      id="btn-submit-report-daily"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" /> Kirim Laporan Harian
                    </button>
                  </div>
                </form>
              ) : subTab === 'mingguan_unused' ? (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-5">
                  <div className="space-y-5 flex-1 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
                    {/* 0. Pilih Tanggal & Periode Laporan */}
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/40 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-3 -mt-3" />
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600" /> Pilih Minggu Laporan
                      </label>
                      <input
                        type="date"
                        required
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full text-xs p-3 border border-emerald-200 bg-white rounded-xl focus:outline-emerald-500 font-extrabold text-slate-700 tracking-wider mb-2"
                        id="report-date-picker-weekly"
                      />
                      {(() => {
                        try {
                          const selDate = new Date(reportDate);
                          const dayOfWeek = selDate.getDay();
                          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                          const mondayDate = new Date(selDate);
                          mondayDate.setDate(selDate.getDate() + diffToMonday);
                          const sundayDate = new Date(mondayDate);
                          sundayDate.setDate(mondayDate.getDate() + 6);
                          const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                          
                          return (
                            <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 justify-center shadow-2xs font-sans tracking-wide">
                              <span>📅</span>
                              <span>Periode: <strong className="underline">{mondayDate.toLocaleDateString('id-ID', options)} s/d {sundayDate.toLocaleDateString('id-ID', options)}</strong></span>
                            </div>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                      <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                        *Sistem mendeteksi minggu secara otomatis. Orang tua cukup mengisi rekap amalan Ananda dari hari <strong>Senin s/d Minggu</strong> berjalan.
                      </p>
                    </div>

                    {/* 1. Shalat 5 Waktu */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/50 shadow-3xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                        <Sun className="w-5 h-5 text-amber-500" />
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">1. Shalat 5 Waktu di Rumah</h3>
                          <p className="text-[9px] text-slate-400 font-semibold">Berapa hari Ananda tertib shalat 5 waktu minggu ini? (0-7 hari)</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((key) => {
                          const labelsMap = {
                            subuh: { label: 'Subuh 🌅', color: 'text-sky-700 bg-sky-50 border-sky-100/50' },
                            dzuhur: { label: 'Dzuhur ☀️', color: 'text-amber-700 bg-amber-50 border-amber-100/50' },
                            ashar: { label: 'Ashar 🌤️', color: 'text-orange-700 bg-orange-50 border-orange-100/50' },
                            maghrib: { label: 'Maghrib 🌆', color: 'text-rose-700 bg-rose-50 border-rose-100/50' },
                            isya: { label: 'Isya 🌌', color: 'text-indigo-700 bg-indigo-50 border-indigo-100/50' }
                          };
                          const info = labelsMap[key];
                          const val = weeklyShalatCounts[key];

                          return (
                            <div key={key} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50/55 transition-all">
                              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-lg border ${info.color}`}>
                                {info.label}
                              </span>
                              
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                      setWeeklyShalatCounts(prev => ({
                                        ...prev,
                                        [key]: Math.max(0, prev[key] - 1)
                                      }));
                                  }}
                                  className="w-7.5 h-7.5 rounded-full border border-slate-200 hover:bg-white hover:border-slate-300 flex items-center justify-center text-slate-600 active:scale-90 transition-all font-bold cursor-pointer bg-slate-50"
                                >
                                  -
                                </button>
                                <span className="w-10 text-center text-xs font-black text-slate-800">
                                  {val} <span className="text-[9px] text-slate-400 font-medium">Hari</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                      setWeeklyShalatCounts(prev => ({
                                        ...prev,
                                        [key]: Math.min(7, prev[key] + 1)
                                      }));
                                  }}
                                  className="w-7.5 h-7.5 rounded-full border border-slate-200 hover:bg-white hover:border-slate-300 flex items-center justify-center text-slate-600 active:scale-90 transition-all font-bold cursor-pointer bg-slate-50"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Amalan Sunnah & Dzikir */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/50 shadow-3xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">2. Shalat Sunnah & Amalan Utama</h3>
                          <p className="text-[9px] text-slate-400 font-semibold">Berapa hari Ananda melaksanakannya minggu ini? (0-7 hari)</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(['tahajud', 'witir', 'zikir'] as const).map((key) => {
                          const labelsMap = {
                            tahajud: { label: 'Shalat Tahajud 🌌', color: 'text-purple-700 bg-purple-50 border-purple-100/50' },
                            witir: { label: 'Shalat Witir 🌙', color: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100/50' },
                            zikir: { label: 'Dzikir Harian 📿', color: 'text-teal-700 bg-teal-50 border-teal-100/50' }
                          };
                          const info = labelsMap[key];
                          const val = weeklySunnahCounts[key];

                          return (
                            <div key={key} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50/55 transition-all">
                              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-lg border ${info.color}`}>
                                {info.label}
                              </span>
                              
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                      setWeeklySunnahCounts(prev => ({
                                        ...prev,
                                        [key]: Math.max(0, prev[key] - 1)
                                      }));
                                  }}
                                  className="w-7.5 h-7.5 rounded-full border border-slate-200 hover:bg-white hover:border-slate-300 flex items-center justify-center text-slate-600 active:scale-90 transition-all font-bold cursor-pointer bg-slate-50"
                                >
                                  -
                                </button>
                                <span className="w-10 text-center text-xs font-black text-slate-800">
                                  {val} <span className="text-[9px] text-slate-400 font-medium">Hari</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                      setWeeklySunnahCounts(prev => ({
                                        ...prev,
                                        [key]: Math.min(7, prev[key] + 1)
                                      }));
                                  }}
                                  className="w-7.5 h-7.5 rounded-full border border-slate-200 hover:bg-white hover:border-slate-300 flex items-center justify-center text-slate-600 active:scale-90 transition-all font-bold cursor-pointer bg-slate-50"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Bacaan Qur'an / Iqro' */}
                    <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-600" /> 3. Kegiatan Membaca (Ngaji)
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setQuranType('quran')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            quranType === 'quran'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-500 border-slate-200'
                          }`}
                          id="quran-type-quran-weekly"
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
                          id="quran-type-iqro-weekly"
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
                              id="input-quran-surah-weekly"
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
                              id="input-quran-ayat-weekly"
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
                              id="select-iqro-jilid-weekly"
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
                              id="input-iqro-halaman-weekly"
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
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/50 shadow-3xs space-y-3.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setBantuOrangTuaChecked(!bantuOrangTuaChecked)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            bantuOrangTuaChecked 
                              ? 'border-pink-500 bg-pink-500 text-white' 
                              : 'border-slate-300 hover:border-pink-500'
                          }`}
                          id="btn-bantu-ortu-checkbox-weekly"
                        >
                          {bantuOrangTuaChecked && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">4. Berbakti & Membantu Orang Tua</h3>
                          <p className="text-[9px] text-slate-400 font-semibold">Ananda berbuat baik / membantu pekerjaan rumah pekan ini?</p>
                        </div>
                      </div>
                      
                      {bantuOrangTuaChecked && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 pt-2 overflow-hidden border-t border-slate-100"
                        >
                          <div>
                            <label className="text-[9px] font-bold text-pink-700 block mb-1">
                              Tulis Kebaikan Yang Dilakukan
                            </label>
                            <textarea
                              required={bantuOrangTuaChecked}
                              value={bantuOrangTuaDesc}
                              onChange={(e) => setBantuOrangTuaDesc(e.target.value)}
                              placeholder="Contoh: Merapikan tempat tidur sendiri, menyapu teras rumah, membantu mencuci piring."
                              className="w-full text-xs p-2.5 border border-pink-200 bg-white rounded-xl focus:outline-pink-400 min-h-[50px] resize-none font-medium text-slate-700"
                              id="input-bantu-ortu-desc-weekly"
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
                          id="input-parent-name-weekly"
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
                      onClick={() => {
                        setStep(1);
                        setSubTab('harian');
                      }}
                      className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      id="btn-submit-report"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" /> Kirim Laporan Mingguan
                    </button>
                  </div>
                </form>
              ) : (
                /* =========================================================
                   RAPORT & EVALUASI PEKANAN (SUBTAB === 'RAPORT')
                   ========================================================= */
                <div className="flex-1 flex flex-col space-y-5" id="raport-mingguan-section">
                  {/* self-contained print stylesheet */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      body {
                        background: white !important;
                        color: black !important;
                      }
                      /* Hide everything except the certificate */
                      header, footer, nav, button, input, select, .print-hidden, #subtab-lapor-harian, #subtab-lapor-mingguan, #subtab-raport-mingguan, .no-print, .back-btn-print {
                        display: none !important;
                      }
                      main {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                      }
                      /* Fill page with certificate */
                      .print-certificate-container {
                        display: block !important;
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        margin: 0 !important;
                        padding: 2.5rem !important;
                        border: 12px double #b45309 !important; /* Gold border */
                        border-radius: 0 !important;
                        box-sizing: border-box !important;
                        background-color: #fdfbf7 !important;
                        z-index: 9999999 !important;
                        page-break-after: avoid !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                      }
                    }
                  `}} />

                  {/* 0. Week Picker & Navigation Controls */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/40 relative overflow-hidden print-hidden no-print">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-3 -mt-3" />
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" /> Periode Evaluasi Raport
                    </label>
                    
                    <div className="flex gap-2">
                      <input
                        type="date"
                        required
                        value={raportDate}
                        onChange={(e) => setRaportDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="flex-1 text-xs p-2.5 border border-emerald-200 bg-white rounded-xl focus:outline-emerald-500 font-extrabold text-slate-700 tracking-wider"
                        id="raport-date-picker"
                      />
                      <button
                        type="button"
                        onClick={() => setRaportDate(new Date().toISOString().split('T')[0])}
                        className="px-3 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all active:scale-95"
                      >
                        Pekan Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const lastWeek = new Date();
                          lastWeek.setDate(lastWeek.getDate() - 7);
                          setRaportDate(lastWeek.toISOString().split('T')[0]);
                        }}
                        className="px-3 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all active:scale-95"
                      >
                        Pekan Lalu
                      </button>
                    </div>

                    {(() => {
                      try {
                        const selDate = new Date(raportDate);
                        const dayOfWeek = selDate.getDay();
                        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                        const mondayDate = new Date(selDate);
                        mondayDate.setDate(selDate.getDate() + diffToMonday);
                        const sundayDate = new Date(mondayDate);
                        sundayDate.setDate(mondayDate.getDate() + 6);
                        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                        
                        return (
                          <div className="mt-2 text-[10px] text-emerald-800 font-extrabold flex items-center gap-1">
                            <span>📅 Pekan berjalan:</span>
                            <span className="underline">{mondayDate.toLocaleDateString('id-ID', options)} s/d {sundayDate.toLocaleDateString('id-ID', options)}</span>
                          </div>
                        );
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </div>

                  {/* AGGREGATE LOGIC & RENDER BLOCK */}
                  {(() => {
                    // Week range calculation
                    let startW = '';
                    let endW = '';
                    try {
                      const selDate = new Date(raportDate);
                      const dayOfWeek = selDate.getDay();
                      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                      const mondayDate = new Date(selDate);
                      mondayDate.setDate(selDate.getDate() + diffToMonday);
                      const sundayDate = new Date(mondayDate);
                      sundayDate.setDate(mondayDate.getDate() + 6);
                      startW = mondayDate.toISOString().split('T')[0];
                      endW = sundayDate.toISOString().split('T')[0];
                    } catch (e) {
                      const today = new Date().toISOString().split('T')[0];
                      startW = today;
                      endW = today;
                    }

                    // Filter reports
                    const weekReports = reports.filter(r => {
                      if (r.santriId !== activeSantriId) return false;
                      if (r.isWeeklyReport) {
                        return r.startDate === startW && r.endDate === endW;
                      }
                      return r.date >= startW && r.date <= endW;
                    });

                    // Check if there's any data at all this week
                    const hasSomeReports = weekReports.length > 0;
                    
                    // Filter attendance
                    const weekAttendance = attendance.filter(a => {
                      return a.santriId === activeSantriId && a.date >= startW && a.date <= endW;
                    });

                    // 1. Shalat 5 Waktu Counts
                    const shalatCounts = { subuh: 0, dzuhur: 0, ashar: 0, maghrib: 0, isya: 0 };
                    const weeklySub = weekReports.find(r => r.isWeeklyReport);
                    const dailySubs = weekReports.filter(r => !r.isWeeklyReport);

                    if (weeklySub && weeklySub.weeklyShalatCounts) {
                      shalatCounts.subuh = weeklySub.weeklyShalatCounts.subuh || 0;
                      shalatCounts.dzuhur = weeklySub.weeklyShalatCounts.dzuhur || 0;
                      shalatCounts.ashar = weeklySub.weeklyShalatCounts.ashar || 0;
                      shalatCounts.maghrib = weeklySub.weeklyShalatCounts.maghrib || 0;
                      shalatCounts.isya = weeklySub.weeklyShalatCounts.isya || 0;
                    } else {
                      dailySubs.forEach(r => {
                        if (r.shalat?.subuh?.performed) shalatCounts.subuh++;
                        if (r.shalat?.dzuhur?.performed) shalatCounts.dzuhur++;
                        if (r.shalat?.ashar?.performed) shalatCounts.ashar++;
                        if (r.shalat?.maghrib?.performed) shalatCounts.maghrib++;
                        if (r.shalat?.isya?.performed) shalatCounts.isya++;
                      });
                    }

                    // 2. Shalat Sunnah & Zikir Counts
                    const sunnahCounts = { tahajud: 0, witir: 0, zikir: 0 };
                    if (weeklySub && weeklySub.weeklySunnahCounts) {
                      sunnahCounts.tahajud = weeklySub.weeklySunnahCounts.tahajud || 0;
                      sunnahCounts.witir = weeklySub.weeklySunnahCounts.witir || 0;
                      sunnahCounts.zikir = weeklySub.weeklySunnahCounts.zikir || 0;
                    } else {
                      dailySubs.forEach(r => {
                        if (r.tahajud) sunnahCounts.tahajud++;
                        if (r.witir) sunnahCounts.witir++;
                        if (r.zikir) sunnahCounts.zikir++;
                      });
                    }

                    // 3. Baca Al-Quran / Iqro List
                    const quranList: { type: 'quran' | 'iqro'; text: string; photo?: string }[] = [];
                    if (weeklySub && weeklySub.quran) {
                      const text = weeklySub.quran.type === 'quran'
                        ? `Al-Qur'an: Surah ${weeklySub.quran.surahOrJilid} Ayat ${weeklySub.quran.ayatOrHalaman}`
                        : `Iqro' Jilid ${weeklySub.quran.surahOrJilid.replace('Jilid', '').trim()} Halaman ${weeklySub.quran.ayatOrHalaman.replace('Halaman', '').trim()}`;
                      quranList.push({ type: weeklySub.quran.type, text, photo: weeklySub.quran.photo });
                    }
                    dailySubs.forEach(r => {
                      if (r.quran && r.quran.surahOrJilid) {
                        const text = r.quran.type === 'quran'
                          ? `Al-Qur'an: Surah ${r.quran.surahOrJilid} Ayat ${r.quran.ayatOrHalaman}`
                          : `Iqro' Jilid ${r.quran.surahOrJilid.replace('Jilid', '').trim()} Halaman ${r.quran.ayatOrHalaman.replace('Halaman', '').trim()}`;
                        if (!quranList.some(item => item.text === text)) {
                          quranList.push({ type: r.quran.type, text, photo: r.quran.photo });
                        }
                      }
                    });

                    // 4. Bantu Orang Tua List
                    const helpfulDeedsList: { desc: string; photo?: string }[] = [];
                    if (weeklySub && weeklySub.bantuOrangTua?.checked && weeklySub.bantuOrangTua?.description) {
                      helpfulDeedsList.push({ desc: weeklySub.bantuOrangTua.description, photo: weeklySub.bantuOrangTua.photo });
                    }
                    dailySubs.forEach(r => {
                      if (r.bantuOrangTua?.checked && r.bantuOrangTua?.description) {
                        if (!helpfulDeedsList.some(item => item.desc === r.bantuOrangTua.description)) {
                          helpfulDeedsList.push({ desc: r.bantuOrangTua.description, photo: r.bantuOrangTua.photo });
                        }
                      }
                    });

                    // 5. Catatan Mosque / Feedback Compiler
                    const mosqueEvaluations: { title: string; note: string }[] = [];
                    if (selectedSantri?.weeklyRecap) {
                      mosqueEvaluations.push({ title: 'Rekomendasi Pekanan Masjid', note: selectedSantri.weeklyRecap });
                    }
                    if (selectedSantri?.guruMosqueNote) {
                      mosqueEvaluations.push({ title: 'Catatan Koreksi Guru Ngaji', note: selectedSantri.guruMosqueNote });
                    } else if (selectedSantri?.adminMosqueNote) {
                      mosqueEvaluations.push({ title: 'Evaluasi Masjid', note: selectedSantri.adminMosqueNote });
                    }
                    weekReports.forEach(r => {
                      if (r.status === 'verified' && r.feedback) {
                        const title = `Verifikasi ${r.isWeeklyReport ? 'Laporan Mingguan' : 'Harian'} (${r.verifiedBy || 'Ustadz'})`;
                        if (!mosqueEvaluations.some(item => item.note === r.feedback)) {
                          mosqueEvaluations.push({ title, note: r.feedback });
                        }
                      }
                    });

                    // 6. Attendance Summary
                    const attCounts = { hadir: 0, sakit: 0, izin: 0, alpa: 0, haid: 0 };
                    weekAttendance.forEach(a => {
                      if (a.status in attCounts) {
                        attCounts[a.status as keyof typeof attCounts]++;
                      }
                    });
                    const totalAttDays = weekAttendance.length;
                    const totalAttPresent = attCounts.hadir;
                    const attPct = totalAttDays > 0 ? Math.round((totalAttPresent / totalAttDays) * 100) : 0;

                    // 7. Dynamic Certificate Reward Configuration
                    const totalPrayersCount = shalatCounts.subuh + shalatCounts.dzuhur + shalatCounts.ashar + shalatCounts.maghrib + shalatCounts.isya;
                    const hasHelpedParents = helpfulDeedsList.length > 0;
                    const hasReadQuran = quranList.length > 0;
                    const hasPerfectAttendance = totalAttDays > 0 && attCounts.alpa === 0;

                    let awardTitle = 'Santri Shalih Berbakat';
                    if (selectedSantri?.gender === 'P') {
                      awardTitle = 'Santri Shalihah Berbakat';
                    }

                    let awardDescription = 'Aktif beribadah, tekun belajar mengaji, dan membiasakan karakter akhlakul karimah sepanjang pekan ini.';
                    let awardEmoji = '🌟';
                    let awardBg = 'from-emerald-500 to-teal-600 text-white';
                    let ribbonColor = 'bg-emerald-600 border-emerald-800';

                    if (totalPrayersCount === 35) {
                      awardTitle = 'Bintang Shalat Sempurna';
                      awardDescription = 'Luar biasa! Melaksanakan shalat fardhu 5 waktu secara tertib tanpa terputus sepanjang pekan ini.';
                      awardEmoji = '🏆';
                      awardBg = 'from-amber-500 to-orange-600 text-white';
                      ribbonColor = 'bg-amber-600 border-amber-800';
                    } else if (hasHelpedParents && totalPrayersCount >= 25) {
                      awardTitle = selectedSantri?.gender === 'P' ? 'Pahlawan Bakti Shalihah' : 'Pahlawan Bakti Shalih';
                      awardDescription = 'Hebat! Konsisten menjaga shalat fardhu serta ikhlas berbakti membantu pekerjaan orang tua di rumah.';
                      awardEmoji = '💖';
                      awardBg = 'from-rose-500 to-pink-600 text-white';
                      ribbonColor = 'bg-rose-600 border-rose-800';
                    } else if (hasReadQuran && totalPrayersCount >= 20) {
                      awardTitle = 'Pecinta Al-Qur\'an';
                      awardDescription = 'Subhanallah! Bersemangat mempelajari Al-Qur\'an / Iqro\' serta tekun membiasakan ibadah harian.';
                      awardEmoji = '📖';
                      awardBg = 'from-sky-500 to-indigo-600 text-white';
                      ribbonColor = 'bg-sky-600 border-sky-800';
                    } else if (hasPerfectAttendance && totalAttDays >= 3) {
                      awardTitle = 'Santri Teladan Disiplin';
                      awardDescription = 'Disiplin istimewa! Selalu hadir tepat waktu di masjid tanpa alpa sepanjang pekan pembelajaran.';
                      awardEmoji = '🛡️';
                      awardBg = 'from-teal-500 to-emerald-600 text-white';
                      ribbonColor = 'bg-teal-600 border-teal-800';
                    } else if (totalPrayersCount >= 25) {
                      awardTitle = 'Pejuang Shalat 5 Waktu';
                      awardDescription = 'Sangat bagus! Berjuang keras menjaga shalat fardhu secara istiqomah.';
                      awardEmoji = '⚡';
                      awardBg = 'from-blue-500 to-cyan-600 text-white';
                      ribbonColor = 'bg-blue-600 border-blue-800';
                    } else if (totalPrayersCount >= 15) {
                      awardTitle = selectedSantri?.gender === 'P' ? 'Santri Shalihah Berbakat' : 'Santri Shalih Berbakat';
                      awardDescription = 'Aktif beribadah, tekun belajar mengaji, dan membiasakan karakter akhlakul karimah sepanjang pekan ini.';
                      awardEmoji = '🌟';
                      awardBg = 'from-emerald-500 to-teal-600 text-white';
                      ribbonColor = 'bg-emerald-600 border-emerald-800';
                    } else if (totalPrayersCount >= 5) {
                      awardTitle = 'Bintang Harapan Pekanan';
                      awardDescription = 'Hebat! Ananda sudah mulai melangkah membiasakan ibadah pekan ini. Setiap langkah kecil bernilai pahala besar. Yuk, pelan-pelan kita tingkatkan shalatnya pekan depan! Ustadz & Orang Tua selalu mendukungmu.';
                      awardEmoji = '🌱';
                      awardBg = 'from-amber-400 to-yellow-500 text-amber-950';
                      ribbonColor = 'bg-amber-500 border-amber-600';
                    } else {
                      awardTitle = selectedSantri?.gender === 'P' ? 'Pejuang Kejujuran Shalihah' : 'Pejuang Kejujuran Shalih';
                      awardDescription = 'Kejujuran adalah mahkota akhlak termulia. Terima kasih Ananda sudah mencatat amalanmu dengan jujur pekan ini. Jadikan kejujuran indah ini sebagai penyemangat untuk meningkatkan ibadah di pekan yang baru ya!';
                      awardEmoji = '💎';
                      awardBg = 'from-indigo-500 to-purple-600 text-white';
                      ribbonColor = 'bg-indigo-600 border-indigo-800';
                    }

                    // Find parent signature in weekly reports if possible
                    const signatureToRender = weekReports.find(r => r.parentSignature)?.parentSignature;

                    // Empty State Warning if no data at all
                    if (!hasSomeReports && weekAttendance.length === 0) {
                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-4">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                            <Calendar className="w-8 h-8" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-700">Belum Ada Data Pekan Ini</h4>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                            Tidak ditemukan rekaman ibadah atau kehadiran mengaji untuk Ananda <strong>{selectedSantri?.name}</strong> pada pekan ini ({formatIDDate(startW)} s/d {formatIDDate(endW)}).
                          </p>
                          <p className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                            Silakan isi menu Lapor Harian atau Lapor Mingguan terlebih dahulu!
                          </p>
                        </div>
                      );
                    }

                    const uniqueReportDays = weeklySub ? 7 : Array.from(new Set(dailySubs.map(d => d.date))).length;
                    const expectedPrayersCount = 35; // Target is strictly 35 shalat in 1 weekly period (7 days)
                    const compliancePercent = Math.min(100, Math.round((totalPrayersCount / expectedPrayersCount) * 100));
                    
                    const lastReadingText = quranList.length > 0 
                      ? quranList[quranList.length - 1].text.replace("Al-Qur'an: ", "").replace("Iqro' ", "").replace("Surah ", "").replace("Ayat ", "") 
                      : 'Belum ada catatan mengaji';
                    const parentDeedsCount = helpfulDeedsList.length;
                    const deedsDescription = helpfulDeedsList.length > 0 ? helpfulDeedsList.map(d => d.desc).join(', ') : 'Belum ada catatan';
                    
                    const adminNotesText = selectedSantri?.guruMosqueNote || selectedSantri?.weeklyRecap || selectedSantri?.adminMosqueNote || "minggu ini baik, rajin, dan hafal materi shalat";

                    // Dynamic automatic evaluation generators
                    let autoPrayerEvaluation = "";
                    let autoPrayerMotivation = "";
                    let evaluationStatus: 'perfect' | 'excellent' | 'warning' | 'danger' = 'excellent';

                    if (compliancePercent === 100) {
                      autoPrayerEvaluation = `Masya Allah! Ananda sangat luar biasa disiplin menjaga seluruh shalat wajib 5 waktu dengan sempurna (${totalPrayersCount} dari ${expectedPrayersCount} shalat terjaga tanpa terlewat selama sepekan).`;
                      autoPrayerMotivation = `Al-Hidayah sangat bangga! Teruskan semangat emas ini ya nak, semoga istiqomah selalu membawa berkah bagi keluarga.`;
                      evaluationStatus = 'perfect';
                    } else if (compliancePercent >= 80) {
                      autoPrayerEvaluation = `Alhamdulillah, kedisiplinan shalat wajib sangat bagus (${totalPrayersCount} dari ${expectedPrayersCount} shalat terjaga, ${compliancePercent}% kepatuhan pekan ini).`;
                      autoPrayerMotivation = `Hanya kurang sedikit lagi untuk mencapai sempurna (${expectedPrayersCount - totalPrayersCount} shalat terlewat atau belum dilaporkan). Ustadz yakin pekan depan ananda bisa meraih 100%!`;
                      evaluationStatus = 'excellent';
                    } else if (compliancePercent >= 50) {
                      autoPrayerEvaluation = `Catatan evaluasi: Baru terlaksana ${totalPrayersCount} dari ${expectedPrayersCount} shalat wajib pekan ini (${compliancePercent}% kepatuhan). Terdapat ${expectedPrayersCount - totalPrayersCount} shalat yang terlewatkan atau belum terlaporkan.`;
                      autoPrayerMotivation = `Yuk, lebih giat lagi di pekan depan dan tidak melalaikan panggilan adzan. Ustadz dan orang tua akan selalu membimbingmu.`;
                      evaluationStatus = 'warning';
                    } else {
                      autoPrayerEvaluation = `Perhatian Khusus: Shalat wajib pekan ini baru tercatat ${totalPrayersCount} dari ${expectedPrayersCount} shalat wajib (${compliancePercent}% kepatuhan). Ada ${expectedPrayersCount - totalPrayersCount} shalat yang belum dikerjakan atau belum dilaporkan.`;
                      autoPrayerMotivation = `Mohon bantuan & perhatian lebih dari Ayah/Bunda untuk terus membimbing, mengingatkan, serta menyemangati ananda di rumah agar shalatnya membaik pekan depan.`;
                      evaluationStatus = 'danger';
                    }

                    let autoSecondaryEvaluation = "";
                    if (sunnahCounts.tahajud >= 5 && parentDeedsCount >= 5) {
                      autoSecondaryEvaluation = `Ananda sangat aktif menghidupkan sunnah Tahajud (${sunnahCounts.tahajud}/7 hari) dan sangat berbakti membantu orang tua (${parentDeedsCount}/7 hari). Pertahankan akhlak mulia ini!`;
                    } else if (sunnahCounts.tahajud > 0 && parentDeedsCount > 0) {
                      autoSecondaryEvaluation = `Alhamdulillah, ananda sudah melatih shalat sunnah Tahajud (${sunnahCounts.tahajud}/7 hari) serta rajin membantu orang tua (${parentDeedsCount}/7 hari) di rumah.`;
                    } else if (sunnahCounts.tahajud > 0) {
                      autoSecondaryEvaluation = `Bagus sekali, ananda sudah melatih shalat sunnah Tahajud (${sunnahCounts.tahajud}/7 hari). Jangan lupa untuk terus melatih kebaikan membantu orang tua juga ya.`;
                    } else if (parentDeedsCount > 0) {
                      autoSecondaryEvaluation = `Alhamdulillah, ananda aktif membantu orang tua (${parentDeedsCount}/7 hari) di rumah. Tingkatkan juga shalat Tahajud agar ibadah sunnahnya makin bersinar!`;
                    } else {
                      autoSecondaryEvaluation = `Jangan lupa untuk mengingatkan ananda melatih shalat sunnah Tahajud serta rajin membantu Ayah/Bunda di rumah minimal sekali sehari.`;
                    }

                    // Share WhatsApp handler
                    const handleShareWhatsApp = () => {
                      const text = `Assalamu'alaikum Warahmatullahi Wabarakaatuh,

Berikut adalah *RANGKUMAN MINGGUAN Kegiatan & Audit Ibadah Santri* dari Al-Hidayah Digital:

👤 *Nama Santri:* ${selectedSantri?.name || 'Ramdan'}
🏫 *Tingkat/Kelas:* ${selectedSantri?.class || 'Al-Qur\'an'}
📅 *Keaktifan Lapor:* ${uniqueReportDays} Hari Melapor (7 Hari Terakhir)

🏠 *RANGKUMAN IBADAH DI RUMAH (7 Hari Terakhir):*
• *Kedisiplinan Shalat 5 Waktu:* ${totalPrayersCount}/${expectedPrayersCount} Shalat Terjaga (${compliancePercent}% Kepatuhan)
• *Shalat Tahajud:* ${sunnahCounts.tahajud} Kali Terlaksana
• *Bacaan Ngaji Terakhir:* ${lastReadingText}
• *Berbakti Ke Orang Tua:* ${parentDeedsCount} Kali
  _(Kebaikan: ${deedsDescription})_

💬 *CATATAN KEADAAN MENGAJI DI MESJID (Tulis Admin/Ustadz):*
"${adminNotesText}"

📊 *AUDIT & EVALUASI IBADAH OTOMATIS:*
• *Kondisi Shalat:* ${autoPrayerEvaluation}
• *Bimbingan & Motivasi:* ${autoPrayerMotivation}
• *Ibadah Tambahan:* ${autoSecondaryEvaluation}

🔑 *PANDUAN LOGIN KEMBALI & LAYANAN MANDIRI:* 
Bapak/Ibu Orang Tua Wali dapat masuk ke aplikasi Al-Hidayah Digital untuk mengisi laporan harian baru, memantau riwayat, serta memberikan tanggapan balasan langsung ke Guru Ngaji.
🔗 *Masuk ke Aplikasi:* https://al-hidayah.digital/
🔑 *PIN Anda:* *${selectedSantri?.pin || '9623'}*

_Semoga Bapak/Ibu Wali Santri selalu diridhoi Allah dan ananda terus istiqomah belajar serta beribadah._

Jazakumullahu Khairan,
*Pengurus Ngaji Mesjid Al-Hidayah *`;

                      try {
                        navigator.clipboard.writeText(text);
                        alert('Laporan mingguan disalin ke clipboard! Silakan bagikan ke keluarga jika diperlukan.');
                      } catch (err) {
                        alert('Gagal menyalin otomatis. Silakan screenshot halaman ini untuk dibagikan.');
                      }
                    };

                    const rawReportText = `Assalamu'alaikum Warahmatullahi Wabarakaatuh,

Berikut adalah *RANGKUMAN MINGGUAN Kegiatan & Audit Ibadah Santri* dari Al-Hidayah Digital:

👤 *Nama Santri:* ${selectedSantri?.name || 'Ramdan'}
🏫 *Tingkat/Kelas:* ${selectedSantri?.class || 'Al-Qur\'an'}
📅 *Keaktifan Lapor:* ${uniqueReportDays} Hari Melapor (7 Hari Terakhir)

🏠 *RANGKUMAN IBADAH DI RUMAH (7 Hari Terakhir):*
• *Kedisiplinan Shalat 5 Waktu:* ${totalPrayersCount}/${expectedPrayersCount} Shalat Terjaga (${compliancePercent}% Kepatuhan)
• *Shalat Tahajud:* ${sunnahCounts.tahajud} Kali Terlaksana
• *Bacaan Ngaji Terakhir:* ${lastReadingText}
• *Berbakti Ke Orang Tua:* ${parentDeedsCount} Kali
  _(Kebaikan: ${deedsDescription})_

💬 *CATATAN KEADAAN MENGAJI DI MESJID (Tulis Admin/Ustadz):*
"${adminNotesText}"

📊 *AUDIT & EVALUASI IBADAH OTOMATIS:*
• *Kondisi Shalat:* ${autoPrayerEvaluation}
• *Bimbingan & Motivasi:* ${autoPrayerMotivation}
• *Ibadah Tambahan:* ${autoSecondaryEvaluation}

🔑 *PANDUAN LOGIN KEMBALI & LAYANAN MANDIRI:* 
Bapak/Ibu Orang Tua Wali dapat masuk ke aplikasi Al-Hidayah Digital untuk mengisi laporan harian baru, memantau riwayat, serta memberikan tanggapan balasan langsung ke Guru Ngaji.
🔗 *Masuk ke Aplikasi:* https://al-hidayah.digital/
🔑 *PIN Anda:* *${selectedSantri?.pin || '9623'}*

_Semoga Bapak/Ibu Wali Santri selalu diridhoi Allah dan ananda terus istiqomah belajar serta beribadah._

Jazakumullahu Khairan,
*Pengurus Ngaji Mesjid Al-Hidayah *`;

                    return (
                      <div className="space-y-6">
                        {/* 📋 RESMI RANGKUMAN MINGGUAN TEXT BLOCK CARD */}
                        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-6 text-left font-sans">
                          {/* Header section with icon and copy button */}
                          <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-600/10 text-emerald-700 rounded-2xl flex items-center justify-center text-xl shadow-3xs font-black">
                                📋
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">Rangkuman Laporan Mingguan</h3>
                                <p className="text-[10px] text-emerald-800 font-bold mt-0.5">Sesuai format resmi Al-Hidayah Digital</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleShareWhatsApp}
                              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Salin Rangkuman
                            </button>
                          </div>

                          {/* Beautiful Interactive Report Display */}
                          <div className="space-y-4">
                            {/* Assalamualaikum Greeting Card */}
                            <div className="p-3.5 bg-white border border-emerald-50/80 rounded-2xl shadow-3xs text-xs text-slate-700 leading-relaxed font-medium">
                              <span className="text-emerald-700 font-bold">Assalamu'alaikum Warahmatullahi Wabarakaatuh,</span>
                              <p className="mt-1 text-slate-500 text-[11px]">
                                Berikut adalah hasil audit kegiatan dan ibadah mingguan ananda yang tercatat di sistem digital:
                              </p>
                            </div>

                            {/* Student Profile Row */}
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-3xs flex items-center gap-2.5">
                                <span className="text-lg bg-indigo-50 p-2 rounded-xl text-indigo-600">👤</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nama Santri</p>
                                  <p className="text-xs font-black text-slate-850 truncate">{selectedSantri?.name || 'Ramdan'}</p>
                                </div>
                              </div>
                              <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-3xs flex items-center gap-2.5">
                                <span className="text-lg bg-teal-50 p-2 rounded-xl text-teal-600">🏫</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tingkat/Kelas</p>
                                  <p className="text-xs font-black text-slate-850 truncate">{selectedSantri?.class || 'Al-Qur\'an'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Days Activeness Badge */}
                            <div className="p-3.5 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">📅</span>
                                <div>
                                  <p className="text-[10px] text-slate-500 font-bold leading-none">Keaktifan Mengirim Laporan</p>
                                  <p className="text-[11px] text-slate-450 mt-1.5 font-medium leading-none">
                                    Periode: <strong className="text-slate-700 font-extrabold">{formatIDDate(startW)} s/d {formatIDDate(endW)}</strong>
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full shadow-3xs shrink-0 self-start sm:self-auto">
                                {uniqueReportDays} Hari Melapor (7 Hari Terakhir)
                              </span>
                            </div>

                            {/* Worship Summary Grid */}
                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-4">
                              <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2">
                                <span>🏠</span> Rangkuman Ibadah Di Rumah
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Shalat 5 Waktu Item */}
                                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                      <span>🕌</span> Shalat 5 Waktu
                                    </span>
                                    <span className="text-[10px] font-black text-slate-800">
                                      {totalPrayersCount}/{expectedPrayersCount} Shalat
                                    </span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="space-y-1">
                                    <div className="w-full bg-slate-250/80 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${
                                          compliancePercent >= 80 ? 'bg-emerald-500' : compliancePercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, compliancePercent)}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-[9px] font-black">
                                      <span className="text-slate-400 font-bold">Tingkat Kepatuhan</span>
                                      <span className={compliancePercent >= 80 ? 'text-emerald-700' : compliancePercent >= 50 ? 'text-amber-700' : 'text-rose-700'}>
                                        {compliancePercent}%
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Shalat Tahajud Item */}
                                <div className="p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-xl flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1.5">
                                    <span>🌙</span> Shalat Tahajud
                                  </span>
                                  <span className="text-xs font-black text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/80">
                                    {sunnahCounts.tahajud}/7 Hari Terlaksana
                                  </span>
                                </div>

                                {/* Mengaji Terakhir Item */}
                                <div className="p-3 bg-amber-50/40 border border-amber-100/50 rounded-xl flex flex-col gap-1.5">
                                  <span className="text-[10px] font-bold text-amber-750 flex items-center gap-1.5">
                                    <span>📖</span> Bacaan Ngaji Terakhir
                                  </span>
                                  <p className="text-[11px] font-black text-amber-950 bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-200/50 leading-relaxed italic">
                                    {lastReadingText}
                                  </p>
                                </div>

                                {/* Berbakti ke Orang Tua Item */}
                                <div className="p-3 bg-rose-50/30 border border-rose-100/50 rounded-xl flex flex-col gap-1.5">
                                  <span className="text-[10px] font-bold text-rose-750 flex items-center gap-1.5">
                                    <span>💖</span> Berbakti Ke Orang Tua
                                  </span>
                                  <div className="bg-rose-50/60 px-2.5 py-1.5 rounded-lg border border-rose-200/50 space-y-1">
                                    <p className="text-[11px] font-extrabold text-rose-950">
                                      {parentDeedsCount}/7 Hari Berbakti
                                    </p>
                                    <p className="text-[9px] text-rose-800 leading-normal italic">
                                      ({deedsDescription})
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Ustadz/Admin Evaluation Box */}
                            <div className="p-4 bg-violet-50/40 border border-violet-100 rounded-2xl shadow-3xs space-y-2 text-left">
                              <h4 className="text-[10px] font-black text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
                                <span>💬</span> Catatan Mengaji Di Masjid (Ustadz/Admin)
                              </h4>
                              <div className="bg-white p-3 rounded-xl border border-violet-100/80 relative overflow-hidden">
                                <span className="absolute -top-1 -left-1 text-4xl text-violet-200/30 font-serif leading-none select-none">“</span>
                                <p className="text-[11px] font-bold text-slate-700 italic leading-relaxed relative pl-3.5 pr-2">
                                  {adminNotesText}
                                </p>
                              </div>
                            </div>

                            {/* 📊 AUDIT & EVALUASI IBADAH OTOMATIS */}
                            <div className={`p-4 rounded-2xl border shadow-3xs space-y-3 text-left transition-all duration-300 ${
                              evaluationStatus === 'perfect' ? 'bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border-emerald-200/80' :
                              evaluationStatus === 'excellent' ? 'bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border-indigo-200/80' :
                              evaluationStatus === 'warning' ? 'bg-gradient-to-br from-amber-50/60 to-yellow-50/30 border-amber-200/80' :
                              'bg-gradient-to-br from-rose-50/60 to-red-50/30 border-rose-200/80'
                            }`}>
                              <div className="flex items-center justify-between">
                                <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                  evaluationStatus === 'perfect' ? 'text-emerald-800' :
                                  evaluationStatus === 'excellent' ? 'text-indigo-800' :
                                  evaluationStatus === 'warning' ? 'text-amber-800' :
                                  'text-rose-800'
                                }`}>
                                  <span>📊</span> Audit & Evaluasi Ibadah Otomatis
                                </h4>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-3xs ${
                                  evaluationStatus === 'perfect' ? 'bg-emerald-100 text-emerald-950 border-emerald-300/60' :
                                  evaluationStatus === 'excellent' ? 'bg-indigo-100 text-indigo-950 border-indigo-300/60' :
                                  evaluationStatus === 'warning' ? 'bg-amber-100 text-amber-950 border-amber-300/60' :
                                  'bg-rose-100 text-rose-950 border-rose-300/60'
                                }`}>
                                  {evaluationStatus === 'perfect' ? 'Sempurna ✨' :
                                   evaluationStatus === 'excellent' ? 'Sangat Baik ⭐' :
                                   evaluationStatus === 'warning' ? 'Butuh Motivasi ⚠️' :
                                   'Perhatian Khusus 📢'}
                                </span>
                              </div>

                              <div className="space-y-2 bg-white/95 p-3 rounded-xl border border-white/40 shadow-4xs text-[11px] leading-relaxed">
                                <div className="space-y-1">
                                  <p className="font-extrabold text-slate-800">
                                    {autoPrayerEvaluation}
                                  </p>
                                  <p className="font-medium text-slate-500 italic">
                                    "{autoPrayerMotivation}"
                                  </p>
                                </div>
                                <div className="border-t border-dashed border-slate-100 pt-2 flex items-start gap-1.5">
                                  <span className="text-amber-650 font-extrabold">📌</span>
                                  <p className="text-slate-600 font-semibold">
                                    {autoSecondaryEvaluation}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Login Guidance with PIN Code */}
                            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl shadow-3xs space-y-3">
                              <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-amber-200/30 pb-2">
                                <span>🔑</span> Panduan Akses Layanan Mandiri
                              </h4>
                              <p className="text-[10px] text-amber-900 font-medium leading-relaxed">
                                Wali Santri dapat masuk ke aplikasi Al-Hidayah Digital untuk mengisi laporan harian baru, memantau riwayat, serta memberikan tanggapan balasan langsung ke Guru Ngaji.
                              </p>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-500">Masuk ke:</span>
                                  <a 
                                    href="https://al-hidayah.digital/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-black text-emerald-700 underline hover:text-emerald-800"
                                  >
                                    https://al-hidayah.digital/
                                  </a>
                                </div>
                                <div className="bg-amber-100 border border-amber-300 text-amber-950 px-3.5 py-1.5 rounded-xl font-bold flex items-center justify-between sm:justify-start gap-2.5 shadow-3xs">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">PIN Anda:</span>
                                  <span className="text-xs font-black tracking-widest font-mono text-red-700 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                                    {selectedSantri?.pin || '9623'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Footer Wishes & Prayers */}
                            <div className="text-center pt-2 pb-1">
                              <p className="text-[10px] text-slate-400 font-medium italic">
                                "Semoga Bapak/Ibu Wali Santri selalu diridhoi Allah dan ananda terus istiqomah belajar serta beribadah."
                              </p>
                              <div className="mt-3 flex flex-col items-center justify-center">
                                <p className="text-[10px] font-black text-slate-650 uppercase tracking-wider">Jazakumullahu Khairan,</p>
                                <p className="text-[9px] font-extrabold text-emerald-800 tracking-wide mt-0.5">Pengurus Masjid Al-Hidayah Digital</p>
                              </div>
                            </div>
                          </div>

                          {/* Accordion / Details for copy-paste raw text */}
                          <details className="group border border-slate-200/50 rounded-2xl bg-slate-50/80 overflow-hidden transition-all duration-300">
                            <summary className="p-3 text-[10px] font-black text-slate-600 bg-slate-100/60 cursor-pointer flex justify-between items-center hover:bg-slate-150/50 select-none list-none [&::-webkit-details-marker]:hidden">
                              <span className="flex items-center gap-2">
                                <span>📱</span> Tampilkan Format Teks Mentah (Untuk WhatsApp)
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="p-4 bg-white rounded-b-2xl border-t border-slate-150/60 font-mono text-[10px] text-slate-600 whitespace-pre-line leading-relaxed select-all" style={{ fontFamily: 'monospace' }}>
                              {rawReportText}
                            </div>
                          </details>
                        </div>

                        {/* 2. PRINT / SHARE ACTIONS BUTTONS */}
                        <div className="flex gap-2 print-hidden no-print">
                          <button
                            type="button"
                            onClick={handleShareWhatsApp}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" /> Bagikan Laporan
                          </button>
                        </div>

                        {/* 3. BENTO GRID STATS BREAKDOWN (DETIL AMALAN PEKANAN) */}
                        <div className="space-y-4 print-hidden no-print">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <span>📊</span> Detail Capaian & Rekapitulasi Ibadah
                          </h3>

                          {/* Shalat 5 Waktu Ringkasan */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-3xs space-y-3">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <Sun className="w-3.5 h-3.5 text-amber-500" /> 1. Ringkasan Shalat 5 Waktu
                            </h4>

                            <div className="space-y-2.5">
                              {(['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((key) => {
                                const labelsMap = {
                                  subuh: { label: 'Subuh 🌅', color: 'bg-sky-500', barBg: 'bg-sky-100 text-sky-800' },
                                  dzuhur: { label: 'Dzuhur ☀️', color: 'bg-amber-500', barBg: 'bg-amber-100 text-amber-800' },
                                  ashar: { label: 'Ashar 🌤️', color: 'bg-orange-500', barBg: 'bg-orange-100 text-orange-800' },
                                  maghrib: { label: 'Maghrib 🌇', color: 'bg-rose-500', barBg: 'bg-rose-100 text-rose-800' },
                                  isya: { label: 'Isya 🌌', color: 'bg-indigo-500', barBg: 'bg-indigo-100 text-indigo-800' }
                                };
                                const info = labelsMap[key];
                                const count = shalatCounts[key];
                                const pct = Math.round((count / 7) * 100);

                                return (
                                  <div key={key} className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                      <span className="text-slate-600">{info.label}</span>
                                      <span className="text-slate-800 font-black">{count} / 7 Hari</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/20 relative flex items-center">
                                      <div 
                                        className={`h-full ${info.color} transition-all duration-500 rounded-lg`}
                                        style={{ width: `${pct}%` }}
                                      />
                                      <span className="absolute inset-0 flex justify-center items-center text-[8px] font-black text-slate-600">
                                        {pct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Shalat Sunnah & Zikir */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-3xs space-y-3">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-500" /> 2. Shalat Sunnah & Zikir Harian
                            </h4>

                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Tahajud 🌌', count: sunnahCounts.tahajud, color: 'border-purple-200 bg-purple-50/40 text-purple-800' },
                                { label: 'Witir 🌙', count: sunnahCounts.witir, color: 'border-fuchsia-200 bg-fuchsia-50/40 text-fuchsia-800' },
                                { label: 'Zikir Harian 📿', count: sunnahCounts.zikir, color: 'border-teal-200 bg-teal-50/40 text-teal-800' }
                              ].map((item, i) => (
                                <div key={i} className={`p-2.5 rounded-xl border text-center space-y-1.5 ${item.color}`}>
                                  <p className="text-[9px] font-black uppercase tracking-wide">{item.label}</p>
                                  <p className="text-sm font-black">{item.count} <span className="text-[9px] font-medium text-slate-500">Hari</span></p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Baca Al-Quran / Iqro */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-3xs space-y-3">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> 3. Kegiatan Membaca (Ngaji) Pekan Ini
                            </h4>

                            {quranList.length > 0 ? (
                              <div className="space-y-3">
                                {quranList.map((item, i) => (
                                  <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/35 flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">📖</span>
                                      <div>
                                        <p className="text-[10px] font-black text-slate-700">{item.text}</p>
                                        <p className="text-[8px] text-slate-400">Tercatat dalam laporan pekanan</p>
                                      </div>
                                    </div>
                                    {item.photo && (
                                      <div className="group relative">
                                        <img 
                                          src={item.photo} 
                                          alt="Bukti Bacaan" 
                                          className="w-10 h-10 object-cover rounded-lg border border-slate-100 cursor-pointer hover:scale-110 transition-all shadow-xs"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[9px] text-slate-400 italic">Belum ada laporan tilawah Al-Qur'an atau Iqro' pekan ini.</p>
                            )}
                          </div>

                          {/* Berbakti Ke Orang Tua */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-3xs space-y-3">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <Heart className="w-3.5 h-3.5 text-pink-500" /> 4. Berbakti Ke Orang Tua (Karakter)
                            </h4>

                            {helpfulDeedsList.length > 0 ? (
                              <div className="space-y-3">
                                {helpfulDeedsList.map((item, i) => (
                                  <div key={i} className="p-2.5 rounded-xl border border-pink-100 bg-pink-50/10 flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">💖</span>
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-700 leading-relaxed italic">"{item.desc}"</p>
                                        <p className="text-[8px] text-pink-700 font-semibold uppercase tracking-wider mt-0.5">Kebaikan Terpuji</p>
                                      </div>
                                    </div>
                                    {item.photo && (
                                      <img 
                                        src={item.photo} 
                                        alt="Bukti Bakti" 
                                        className="w-10 h-10 object-cover rounded-lg border border-pink-100 cursor-pointer hover:scale-110 transition-all shadow-xs"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[9px] text-slate-400 italic">Belum ada catatan pembiasaan akhlakul karimah pekan ini.</p>
                            )}
                          </div>

                          {/* Catatan Selama Belajar di Masjid */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-3xs space-y-3">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> 5. Catatan & Evaluasi Pembelajaran Masjid
                            </h4>

                            {mosqueEvaluations.length > 0 ? (
                              <div className="space-y-2.5">
                                {mosqueEvaluations.map((item, i) => (
                                  <div key={i} className="p-3 bg-amber-50/50 border border-amber-100/50 rounded-xl space-y-1 relative">
                                    <div className="absolute top-2 right-2 text-xs opacity-20 pointer-events-none">📜</div>
                                    <p className="text-[9px] font-extrabold uppercase tracking-wide text-amber-800">{item.title}</p>
                                    <p className="text-[10px] text-slate-600 leading-relaxed font-sans">{item.note}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                <p className="text-[9px] text-slate-400 italic">Ustadz/Ustadzah belum menuliskan catatan khusus untuk pekan ini.</p>
                              </div>
                            )}
                          </div>

                          {/* Kehadiran Masjid */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-3xs space-y-3">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> 6. Kehadiran Mengaji di Masjid
                            </h4>

                            <div className="flex items-center gap-4 bg-slate-50/40 p-3 rounded-xl border border-slate-100">
                              <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                  <path
                                    className="text-slate-100"
                                    strokeWidth="3.5"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <path
                                    className="text-indigo-600"
                                    strokeDasharray={`${attPct}, 100`}
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                </svg>
                                <span className="absolute text-xs font-black text-slate-800">{attPct}%</span>
                              </div>

                              <div className="flex-1 space-y-1">
                                <p className="text-[10px] font-black text-slate-700">Persentase Kehadiran: <span className="text-indigo-700">{attPct}%</span></p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-500 font-medium">
                                  <span>Hadir: <strong className="text-slate-700 font-bold">{attCounts.hadir}</strong></span>
                                  <span>Sakit/Izin: <strong className="text-slate-700 font-bold">{attCounts.sakit + attCounts.izin}</strong></span>
                                  <span>Alpa: <strong className="text-red-500 font-bold">{attCounts.alpa}</strong></span>
                                </div>
                                <p className="text-[8px] text-slate-400">Total data mengaji terekam: {totalAttDays} hari pekan ini.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
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
