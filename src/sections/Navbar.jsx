import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";

function Navigation({ onNavigate }) {
  return (
    <ul className="nav-ul">
      <li className="nav-li">
        <a className="nav-link" href="#home" onClick={onNavigate}>
          Home
        </a>
      </li>
      <li className="nav-li">
        <a className="nav-link" href="#about" onClick={onNavigate}>
          About
        </a>
      </li>
      <li className="nav-li">
        <a className="nav-link" href="#work" onClick={onNavigate}>
          Work
        </a>
      </li>
      <li className="nav-li">
        <a className="nav-link" href="#contact" onClick={onNavigate}>
          Contact
        </a>
      </li>
    </ul>
  );
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null); 

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e) => {
      const target = e.target;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      closeMenu();
    };

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("touchstart", handleOutside);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed inset-x-0 z-20 w-full backdrop-blur-lg bg-primary/40">
      <div className="mx-auto c-space max-w-7xl">
        <div className="flex items-center justify-between py-2 sm:py-0">
          <a
            href="/"
            className="text-xl font-bold transition-colors text-neutral-400 hover:text-white"
          >
            Shadhad
          </a>

          {/* Toggle button (hidden on sm+) */}
          <button
            ref={buttonRef}
            onClick={() => setIsOpen((v) => !v)}
            className="flex cursor-pointer text-neutral-400 hover:text-white focus:outline-none sm:hidden"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <img
              src={isOpen ? "assets/close.svg" : "assets/menu.svg"}
              className="w-6 h-6"
              alt="toggle"
            />
          </button>

          {/* desktop nav */}
          <nav className="hidden sm:flex">
            <Navigation onNavigate={() => { /* no-op on desktop */ }} />
          </nav>
        </div>
      </div>

      {isOpen && (
        <motion.div
          ref={menuRef}
          className="block overflow-hidden text-center sm:hidden"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          style={{ maxHeight: "100vh" }}
          transition={{ duration: 0.25 }}
        >
          <nav className="pb-5">
            <Navigation onNavigate={closeMenu} />
          </nav>
        </motion.div>
      )}
    </div>
  );
};

export default Navbar;
