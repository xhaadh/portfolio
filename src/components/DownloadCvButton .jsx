import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const DownloadCvButton = () => {
  const [status, setStatus] = useState("idle"); // 'idle' | 'downloading' | 'done' | 'error'
  const resumeUrl = "/assets/resume.pdf"; // <-- put resume at public/assets/resume.pdf
  const fileName = "Shadhad_Resume.pdf";

  const downloadFile = () => {
    try {
      setStatus("downloading");

      // Create a temporary anchor and click it to trigger the browser download.
      const link = document.createElement("a");
      link.href = resumeUrl;
      link.download = fileName;
      // For some browsers if the file is on another origin, `download` may be ignored.
      // We still trigger the navigation which will open the PDF in a new tab or download it.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Use a small timeout to mimic completion feedback (file delivery may take longer).
      setTimeout(() => setStatus("done"), 600);
      setTimeout(() => setStatus("idle"), 2600); // reset after a short time
    } catch (err) {
      console.error("Download failed", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <motion.button
      onClick={downloadFile}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 1.05 }}
      className="relative px-1 py-4 text-sm text-center rounded-full font-extralight bg-primary w-[12rem] cursor-pointer overflow-hidden"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {status === "done" ? (
          <motion.p
            className="flex items-center justify-center gap-2"
            key="done"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.12, ease: "easeInOut" }}
          >
            <img src="assets/copy-done.svg" className="w-5" alt="copy Icon" />
            Downloaded
          </motion.p>
        ) : status === "downloading" ? (
          <motion.p
            className="flex items-center justify-center gap-2"
            key="downloading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.15" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            Downloading...
          </motion.p>
        ) : status === "error" ? (
          <motion.p
            className="flex items-center justify-center gap-2 text-red-400"
            key="error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            <img src="/assets/error-icon.svg" className="w-5" alt="error" />
            Download failed
          </motion.p>
        ) : (
          <motion.p
            className="flex items-center justify-center gap-2"
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <img src="assets/copy.svg" className="w-5" alt="copy icon" />
            Download CV
          </motion.p>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default DownloadCvButton;
