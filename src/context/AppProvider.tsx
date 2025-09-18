"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { validateHisenseCookie } from "@/helpers/HisenseCookie";
import HisenseCookieInput from "@/components/HisenseCookieInput";
import Sidebar from "@/components/Sidebar";

// Based on output_owo_api.json
export interface Ptk {
  ptk_terdaftar_id: string;
  ptk_id: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  tanggal_lahir: string;
  nik: string;
  nuptk: string | null;
  nip: string | null;
  nrg: string | null;
  kepegawaiian: string;
  jenis_ptk: string;
  jabatan_ptk: string;
  nomor_surat_tugas: string;
  tanggal_surat_tugas: string;
  tmt_tugas: string;
  ptk_induk: 'Ya' | 'Tidak';
  last_update: string;
}

export interface Datadik {
  id: string;
  name: string;
  address: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kepalaSekolah: string;
  ptk: Ptk[];
}

export interface HisenseData {
  isGreen: boolean;
  schoolInfo: { [key: string]: string };
  images: { [key: string]: string };
  processHistory: { tanggal: string; status: string; keterangan: string }[];
  q: string;
  npsn: string;
}

export interface SchoolData {
  datadik: Datadik;
  hisense: HisenseData;
}

interface AppContextType {
  schoolData: SchoolData | null;
  isLoading: boolean;
  error: string | null;
  npsn: string;
  setNpsn: React.Dispatch<React.SetStateAction<string>>;
  fetchDataByNpsn: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  verifierName: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [verifierName, setVerifierName] = useState<string | null>(null);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [npsn, setNpsn] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const fetchDataByNpsn = useCallback(async () => {
    if (!npsn) {
      setError("NPSN tidak boleh kosong.");
      return;
    }
    setIsLoading(true);
    setSchoolData(null);
    setError(null);

    try {
      const cookie = localStorage.getItem("hisense_cookie");
      if (!cookie) {
        setShowCookieModal(true);
        throw new Error("Cookie Hisense tidak ditemukan.");
      }

      const validName = await validateHisenseCookie(cookie);
      if (!validName) {
        setVerifierName(null);
        setShowCookieModal(true);
        throw new Error("Cookie Hisense kadaluarsa atau tidak valid.");
      }
      setVerifierName(validName);

      const response = await fetch("https://owo-api-production.up.railway.app/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: npsn, cookie }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Gagal mengambil data dari API.");
      }

      const data: SchoolData = await response.json();
      setSchoolData(data);

    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [npsn]);

  const checkCookie = useCallback(() => {
    const savedCookie = localStorage.getItem("hisense_cookie");
    if (savedCookie) {
      validateHisenseCookie(savedCookie).then((validName) => {
        if (validName) {
          setVerifierName(validName);
          setShowCookieModal(false);
        } else {
          setVerifierName(null);
          setShowCookieModal(true);
        }
      });
    } else {
      setShowCookieModal(true);
    }
  }, []);

  useEffect(() => {
    checkCookie();
  }, [checkCookie]);

  const handleCookieSuccess = () => {
    checkCookie();
  };

  if (showCookieModal && !verifierName) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-96 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Masukkan PHPSESSID
          </h2>
          <HisenseCookieInput onSuccess={handleCookieSuccess} />
          <p className="text-sm text-black">
            Cookie Hisense diperlukan untuk mengambil data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        schoolData,
        isLoading,
        error,
        npsn,
        setNpsn,
        fetchDataByNpsn,
        isSidebarOpen,
        toggleSidebar,
        verifierName,
      }}
    >
      <div className="flex h-screen bg-gray-200">
        <Sidebar />
        <main className="relative flex-grow p-6 overflow-y-auto bg-gray-100 text-gray-900">
          {children}
        </main>
      </div>
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="md:hidden fixed inset-0 bg-black/50 z-20"
        />
      )}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined)
    throw new Error("useAppContext must be used within an AppProvider");
  return context;
}
