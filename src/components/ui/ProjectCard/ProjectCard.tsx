import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { type Project } from "../../../data/projects";
import "./ProjectCard.css";

type ProjectCardProps = {
  project: Project;
  index: number;
};

export const ProjectCard = ({ project, index }: ProjectCardProps) => {
  return (
    <motion.article
      className="project-card"
      initial={{ opacity: 0, y: 46, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.78,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <a href="#contact" aria-label={`Cotizar un proyecto similar a ${project.title}`}>
        <div className="project-card__media">
          {project.image ? (
            <img
              src={project.image}
              alt={`${project.vehicle} - ${project.title}`}
              loading="lazy"
            />
          ) : (
            <div className="project-card__placeholder" aria-hidden="true">
              <span>{project.vehicle}</span>
              <strong>UPG79</strong>
            </div>
          )}
        </div>

        <div className="project-card__content">
          <div className="project-card__top">
            <span>{project.vehicle}</span>
            <small>{project.category}</small>
          </div>

          <h3>{project.title}</h3>

          <p className="project-card__summary">{project.summary}</p>

          <div className="project-card__tags">
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <div className="project-card__footer">
            <p>{project.result}</p>

            <span className="project-card__link">
              Cotizar algo similar
              <ArrowUpRight size={16} strokeWidth={1.7} aria-hidden="true" />
            </span>
          </div>
        </div>
      </a>
    </motion.article>
  );
};
