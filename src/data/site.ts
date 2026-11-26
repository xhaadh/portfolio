/**
 * Site-wide content for Shadhad Shereef's portfolio.
 */
export interface Social {
  label: string;
  href: string;
  download?: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location: string;
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  period: string;
}

export const site = {
  name: 'SHADHAD SHEREEF',
  /** Wordmark in the top-left corner (condensed display font). */
  logo: 'SHADHAD',
  tagline: 'Software Developer',
  description:
    'Shadhad Shereef is a Software Developer based in Calicut, India, specializing in React, Next.js, TypeScript, and modern web applications with rich interactive experiences.',
  url: 'https://shadhadshereef.in',
  /** Two-line giant heading on the about page. */
  aboutHeading: ['CODE', '+CRAFT'] as [string, string],
  socials: [
    { label: 'Email', href: 'mailto:shadhadshereefam@gmail.com' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/shadhad-shereef-am' },
    { label: 'GitHub', href: 'https://github.com/xhaadh' },
    { label: 'Download CV', href: '/SHADHAD_SHEREEF.pdf', download: 'SHADHAD_SHEREEF.pdf' },
  ] satisfies Social[],
  /** How many socials are shown in the bottom-right corner on home / project pages. */
  cornerSocials: 4,
  experience: [
    {
      company: 'Noviindus Technologies',
      role: 'Software Developer',
      period: 'Dec 2025 – Present',
      location: 'Calicut, India',
    },
    {
      company: 'Hackite Infotech',
      role: 'Full Stack Developer / Tech Lead',
      period: 'Sep 2025 – Nov 2025',
      location: 'Thrissur, India',
    },
    {
      company: 'FUINSS Software Solution',
      role: 'Software Developer Intern',
      period: 'Apr 2024 – Jun 2025',
      location: 'Calicut, India',
    },
  ] satisfies ExperienceItem[],
  skills: [
    {
      category: 'Languages',
      items: ['JavaScript', 'TypeScript', 'PHP', 'HTML5 / CSS3'],
    },
    {
      category: 'Frontend & UI',
      items: ['React.js', 'Next.js', 'React Native', 'Tailwind CSS', 'GSAP'],
    },
    {
      category: 'State & Data',
      items: ['TanStack Query', 'Redux Toolkit', 'Zustand', 'REST APIs', 'Axios'],
    },
    {
      category: 'Backend & Database',
      items: ['Node.js', 'Express.js', 'PostgreSQL', 'MongoDB', 'CodeIgniter'],
    },
    {
      category: 'Tools & DevOps',
      items: ['Git & GitHub', 'Docker', 'Vercel', 'Postman', 'Figma'],
    },
  ] satisfies SkillCategory[],
  education: {
    degree: 'B.Sc Computer Science',
    institution: 'Amal College of Advanced Studies, Nilambur',
    period: '2021 – 2024',
  } satisfies EducationItem,
  clients: [
    'Ealzo Healthcare',
    'FUINSS Software',
    'Hackite Infotech',
    'Know My Build (UK)',
    'Noviindus Technologies',
    'OrthoBOT_X',
    'Prime MLM',
  ],
  copyright: 'All rights reserved',
  year: 2026,
};

export type Site = typeof site;
