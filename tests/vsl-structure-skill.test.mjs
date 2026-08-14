import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const skill = await readFile(new URL("../.codex/skills/vsl-structure-dissector/SKILL.md", import.meta.url), "utf8");
const spec = await readFile(new URL("../.codex/skills/vsl-structure-dissector/references/structure-spec.md", import.meta.url), "utf8");

test("skill de dissecação cobre todos os blocos e limites informados", () => {
  for (const label of [
    "Microlead", "Lead", "Background History", "Expert Presentation", "Emotional Story", "Discovery Story",
    "Tese de Marketing", "Mecanismo do Problema", "Mecanismo da Solução", "Product Build-Up", "Fórmula",
    "Personal Testimony", "Bloco de Oferta", "Pitch", "Pós-Pitch", "Bônus", "FAQ", "Depoimentos de Terceiros",
  ]) assert.match(skill + spec, new RegExp(label));
  assert.match(skill, /Ler integralmente \[references\/structure-spec\.md\]/);
  assert.match(skill, /toda a duração ou todo o texto estiver coberto, sem lacunas/);
  assert.match(spec, /posição na estrutura principal/);
  assert.match(spec, /Nunca absorver o depoimento/);
  assert.match(skill, /A dissecação não pode devolver a transcrição traduzida/);
  assert.match(skill, /Lead 1.*Lead 2.*Lead 3/);
  assert.match(spec, /Quiz.*Pitch ou Pós-Pitch/);
  assert.match(spec, /não pode ser apenas a tradução reorganizada/);
});
