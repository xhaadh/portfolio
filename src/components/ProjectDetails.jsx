import { motion } from "motion/react";

const ProjectDetails = ({
  title,
  description,
  subDescription = [],
  image,
  tags = [],
  href,
  closeModal,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-full p-4"
      aria-modal="true"
      role="dialog"
      aria-label={`${title} details`}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden
      />

      <motion.div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-sm border border-white/10 shadow-2xl bg-gradient-to-l from-midnight to-navy"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* close button */}
        <button
          onClick={closeModal}
          aria-label="Close project details"
          className="absolute top-4 right-4 z-20 rounded-sm bg-gray-400 p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <img src="/assets/close.svg" className="w-5 h-5" alt="Close" />
        </button>

        {/* image area */}
        <div className="w-full h-56 sm:h-64 md:h-72 overflow-hidden rounded-smmd">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* content area — scrollable if content is tall */}
        <div className="p-5 overflow-auto max-h-[calc(90vh-18rem)]">
          <h3 className="mb-2 text-2xl font-bold text-white">{title}</h3>

          <p className="mb-3 text-sm text-neutral-300">{description}</p>

          {Array.isArray(subDescription) &&
            subDescription.map((subDesc, idx) => (
              <p key={`sub-${idx}`} className="mb-3 text-sm text-neutral-300">
                {subDesc}
              </p>
            ))}

          <div className="flex items-center justify-between mt-4 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {Array.isArray(tags) &&
                tags.map((tag, idx) => (
                  <img
                    key={tag?.id ?? `tag-${idx}`}
                    src={tag?.path ?? tag}
                    alt={tag?.name ?? `tag-${idx}`}
                    className="rounded-sm w-10 h-10 object-contain bg-white/5 p-1"
                    loading="lazy"
                  />
                ))}
            </div>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 transition"
            >
              View <span className="md:flex hidden">Project</span>
              <img src="/assets/arrow-up.svg" className="w-4 h-4" alt="" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectDetails;
