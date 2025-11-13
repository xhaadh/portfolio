import { OrbitingCircles } from "./OrbitingCircles";

export function Frameworks() {
  const skills = [
    "css",
    "git",
    "html",
    "javascript",
    "react",
    "tailwindcss",
    "vite",
    "postgresql",
    "node-js",
    "express",
    "mongo-db",
    "postman",
    "redux",
    "typescript",
    "php",
    "jwt",
    "laravel"
  ];
  return (
    <div className="relative flex h-[15rem] w-full flex-col items-center justify-center">
      <OrbitingCircles iconSize={40}>
        {skills.map((skill, index) => (
          <Icon key={index} src={`assets/logos/${skill}.png`} />
        ))}
      </OrbitingCircles>
      <OrbitingCircles iconSize={25} radius={100} reverse speed={2}>
        {skills.reverse().map((skill, index) => (
          <Icon key={index} src={`assets/logos/${skill}.png`} />
        ))}
      </OrbitingCircles>
    </div>
  );
}

const Icon = ({ src }) => (
  <img src={src} className="duration-200 rounded-sm hover:scale-110" />
);
