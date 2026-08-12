import { DatabaseShell } from "../_components/database-shell";
import { KnowledgeConsole } from "../_components/knowledge-console";

export default function KnowledgePage() {
  return (
    <DatabaseShell
      eyebrow="AI retrieval lab"
      title="Facts connected by evidence"
      description="The assistant follows explicit entity relations for exact gameplay questions and reserves semantic search for fuzzy descriptions and lore."
    >
      <section className="knowledge-principles" aria-label="Retrieval design">
        <article>
          <span>01</span>
          <strong>Resolve</strong>
          <p>Names and aliases resolve to one canonical entity.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Traverse</strong>
          <p>Typed relations connect requirements, rewards, enemies, and regions.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Answer</strong>
          <p>Compact evidence and a knowledge revision accompany every response.</p>
        </article>
      </section>
      <KnowledgeConsole />
    </DatabaseShell>
  );
}

