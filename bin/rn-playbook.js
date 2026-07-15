#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const pkgRoot = path.join(__dirname, '..');
const cwd = process.cwd();

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const ESLINT_REF = "require.resolve('rn-playbook/eslint')";
const QUALITY_SCRIPTS = {
  lint: 'eslint .',
  'lint:fix': 'eslint . --fix',
  typecheck: 'tsc --noEmit',
  test: 'jest',
  quality: 'yarn lint && yarn typecheck && yarn test',
};

function log(msg) {
  process.stdout.write(msg + '\n');
}

// Copie récursive : écrase les fichiers de même nom, ne supprime jamais les extras.
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return 0;
  }
  fs.mkdirSync(dest, { recursive: true });
  let copied = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copied += copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
      copied += 1;
    }
  }
  return copied;
}

// Ajoute les scripts qualité manquants sans écraser l'existant, en préservant l'indentation.
function patchPackageScripts() {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { status: 'missing' };
  }
  const raw = fs.readFileSync(pkgPath, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { status: 'unparseable' };
  }

  const indentMatch = raw.match(/\n([\t ]+)"/);
  const indent = indentMatch ? indentMatch[1] : '  ';

  json.scripts = json.scripts || {};
  const added = [];
  const conflicts = [];
  for (const [key, value] of Object.entries(QUALITY_SCRIPTS)) {
    if (json.scripts[key] === undefined) {
      json.scripts[key] = value;
      added.push(key);
    } else if (json.scripts[key] !== value) {
      conflicts.push(key);
    }
  }

  if (added.length > 0) {
    const trailingNl = raw.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(pkgPath, JSON.stringify(json, null, indent) + trailingNl);
  }
  return { status: 'ok', added, conflicts };
}

// Trouve les bornes d'un littéral tableau `extends: [ ... ]`, brackets équilibrés.
function findExtendsArray(content) {
  const key = content.match(/extends\s*:\s*/);
  if (!key) {
    return null;
  }
  const arrStart = content.indexOf('[', key.index);
  if (arrStart === -1) {
    return null;
  }
  // Entre `extends:` et `[`, uniquement du blanc → sinon ce n'est pas un tableau (ex. string).
  const between = content.slice(key.index + key[0].length, arrStart);
  if (between.trim() !== '') {
    return null;
  }
  let depth = 0;
  for (let i = arrStart; i < content.length; i += 1) {
    const c = content[i];
    if (c === '[') {
      depth += 1;
    } else if (c === ']') {
      depth -= 1;
      if (depth === 0) {
        return { arrStart, arrEnd: i };
      }
    }
  }
  return null;
}

// Branche la config ESLint du playbook, uniquement dans un .eslintrc.js/.cjs à `extends` tableau.
function patchEslint() {
  const jsCandidates = ['.eslintrc.js', '.eslintrc.cjs']
    .map((f) => path.join(cwd, f))
    .filter((p) => fs.existsSync(p));
  const otherCandidates = [
    '.eslintrc.json', '.eslintrc', '.eslintrc.yaml', '.eslintrc.yml',
    'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs',
  ]
    .map((f) => path.join(cwd, f))
    .filter((p) => fs.existsSync(p));

  const target = jsCandidates[0];
  if (!target) {
    return otherCandidates.length
      ? { status: 'manual', reason: 'non-js', file: path.basename(otherCandidates[0]) }
      : { status: 'manual', reason: 'none' };
  }

  let content = fs.readFileSync(target, 'utf8');
  const file = path.basename(target);
  if (content.includes('rn-playbook/eslint')) {
    return { status: 'already', file };
  }

  const arr = findExtendsArray(content);
  if (!arr) {
    return { status: 'manual', reason: 'no-extends-array', file };
  }

  const inner = content.slice(arr.arrStart + 1, arr.arrEnd);
  let lastNonWs = -1;
  for (let i = inner.length - 1; i >= 0; i -= 1) {
    if (!/\s/.test(inner[i])) {
      lastNonWs = i;
      break;
    }
  }

  let insertPos;
  let insertText;
  if (lastNonWs === -1) {
    // Tableau vide.
    insertPos = arr.arrStart + 1;
    insertText = `\n  ${ESLINT_REF},\n`;
  } else {
    insertPos = arr.arrStart + 1 + lastNonWs + 1;
    const needComma = inner[lastNonWs] !== ',';
    const lineStart = inner.lastIndexOf('\n', lastNonWs) + 1;
    const lineIndent = (inner.slice(lineStart, lastNonWs + 1).match(/^(\s*)/) || [, '  '])[1];
    insertText = `${needComma ? ',' : ''}\n${lineIndent}${ESLINT_REF},`;
  }

  content = content.slice(0, insertPos) + insertText + content.slice(insertPos);
  fs.writeFileSync(target, content);
  return { status: 'patched', file };
}

function init() {
  log(`\n${CYAN}rn-playbook init${RESET} — installation des assets dans ${DIM}${cwd}${RESET}\n`);

  const agents = copyDir(
    path.join(pkgRoot, 'templates', 'agents'),
    path.join(cwd, '.claude', 'agents'),
  );
  log(`${GREEN}✓${RESET} ${agents} agent(s) → .claude/agents/`);

  const commands = copyDir(
    path.join(pkgRoot, 'templates', 'commands'),
    path.join(cwd, '.claude', 'commands'),
  );
  log(`${GREEN}✓${RESET} ${commands} commande(s) → .claude/commands/`);

  // CLAUDE.md — jamais écrasé (delta projet).
  const claudeTarget = path.join(cwd, 'CLAUDE.md');
  if (fs.existsSync(claudeTarget)) {
    log(`${YELLOW}•${RESET} CLAUDE.md existe déjà — laissé intact ${DIM}(delta projet)${RESET}`);
  } else {
    fs.copyFileSync(path.join(pkgRoot, 'CLAUDE.template.md'), claudeTarget);
    log(`${GREEN}✓${RESET} CLAUDE.md créé depuis le template ${YELLOW}→ remplir les <...>${RESET}`);
  }

  const manual = [];

  // ESLint.
  const eslint = patchEslint();
  if (eslint.status === 'patched') {
    log(`${GREEN}✓${RESET} ${eslint.file} — config rn-playbook branchée dans extends`);
  } else if (eslint.status === 'already') {
    log(`${YELLOW}•${RESET} ${eslint.file} — config rn-playbook déjà branchée`);
  } else {
    const detail =
      eslint.reason === 'none' ? 'aucune config ESLint trouvée'
        : eslint.reason === 'non-js' ? `config ${eslint.file} non éditable automatiquement`
          : `extends non détecté dans ${eslint.file}`;
    log(`${YELLOW}•${RESET} ESLint — ${detail}`);
    manual.push(`.eslintrc.js — ajouter ${DIM}${ESLINT_REF}${RESET} en fin de extends (après @react-native)`);
  }

  // Scripts package.json.
  const scripts = patchPackageScripts();
  if (scripts.status === 'ok' && scripts.added.length > 0) {
    log(`${GREEN}✓${RESET} package.json — ${scripts.added.length} script(s) ajouté(s) : ${DIM}${scripts.added.join(', ')}${RESET}`);
  } else if (scripts.status === 'ok') {
    log(`${YELLOW}•${RESET} package.json — scripts qualité déjà présents`);
  } else {
    const detail = scripts.status === 'missing' ? 'package.json introuvable' : 'package.json illisible';
    log(`${YELLOW}•${RESET} package.json — ${detail}`);
    manual.push('package.json — ajouter les scripts lint / typecheck / test / quality');
  }
  if (scripts.status === 'ok' && scripts.conflicts.length > 0) {
    log(`${YELLOW}!${RESET} scripts existants conservés (non écrasés) : ${DIM}${scripts.conflicts.join(', ')}${RESET}`);
  }

  if (manual.length > 0) {
    log(`\n${CYAN}Reste à brancher à la main :${RESET}`);
    for (const item of manual) {
      log(`  ${DIM}-${RESET} ${item}`);
    }
  }

  log(`\n${DIM}Relance cette commande après un \`yarn up rn-playbook\` pour rafraîchir agent & commande.${RESET}\n`);
}

function main() {
  const cmd = process.argv[2] || 'init';
  if (cmd === 'init') {
    init();
    return;
  }
  log(`Commande inconnue : ${cmd}\nUsage : npx rn-playbook init`);
  process.exitCode = 1;
}

main();
