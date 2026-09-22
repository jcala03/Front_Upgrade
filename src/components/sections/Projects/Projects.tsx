import { projects } from "../../../data/projects";
import { ProjectCard } from "../../ui/ProjectCard";
import { Reveal } from "../../ui/Reveal";
import "./Projects.css";

export const Projects = () => {
  return (
    <section
      className="section projects"
      id="projects"
      aria-labelledby="projects-title"
    >
      <div className="container-wide projects__inner">
        <div className="projects__header">
          <Reveal>
            <span className="section-kicker">Proyectos destacados</span>

            <div className="projects__headline">
              <h2 className="section-title" id="projects-title">
                Trabajos que cambian la presencia de un vehículo.
              </h2>

              <p>
                Cada proyecto combina piezas, proporción, instalación y criterio
                visual para lograr un resultado que se vea premium, agresivo y
                bien integrado.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="projects__list">
          {projects.map((project, index) => (
            <ProjectCard
              project={project}
              index={index}
              key={project.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
